/**
 * Subscription Polling Service
 * Handles subscription status monitoring and role management
 * 
 * Dual-mode polling system:
 * - Normal mode: Polls every 60 minutes for all active subscriptions
 * - Fast mode: Polls every 15 seconds for 20 minutes after checkout URL generated
 */

const stripeService = require("./stripeService");
const database = require("./database");
const logger = require("../utils/logger");
const stripeConfig = require("../config/stripe");
const ROLES = require("../constants/roles");
const CHANNELS = require("../constants/channels");

// Polling state
let normalPollingInterval = null;
let fastPollingInterval = null;

// Pending checkouts tracking: Map<discordId, { sessionId, createdAt }>
const pendingCheckouts = new Map();

// Reference to Discord client (set during initialization)
let discordClient = null;

/**
 * Initialize the subscription service
 * @param {Object} client - Discord client instance
 */
function init(client) {
  discordClient = client;
  stripeService.initStripe();
  logger.info("Subscription service initialized");
}

/**
 * Start the normal polling interval
 */
function startPolling() {
  if (normalPollingInterval) {
    logger.warn("Normal polling already running");
    return;
  }

  // Run immediately on start
  checkAllSubscriptions();

  // Then run every 60 minutes
  normalPollingInterval = setInterval(
    checkAllSubscriptions,
    stripeConfig.polling.normalInterval
  );

  logger.info(
    `Started normal subscription polling (every ${stripeConfig.polling.normalInterval / 60000} minutes)`
  );
}

/**
 * Stop all polling
 */
function stopPolling() {
  if (normalPollingInterval) {
    clearInterval(normalPollingInterval);
    normalPollingInterval = null;
    logger.info("Stopped normal subscription polling");
  }

  if (fastPollingInterval) {
    clearInterval(fastPollingInterval);
    fastPollingInterval = null;
    logger.info("Stopped fast subscription polling");
  }

  pendingCheckouts.clear();
}

/**
 * Trigger fast polling for a specific user after checkout URL generation
 * @param {string} discordId - Discord user ID
 * @param {string} sessionId - Stripe checkout session ID
 */
function triggerFastPolling(discordId, sessionId) {
  // Add to pending checkouts
  pendingCheckouts.set(discordId, {
    sessionId,
    createdAt: Date.now(),
  });

  logger.info(
    `Added Discord user ${discordId} to fast polling queue (session: ${sessionId})`
  );

  // Start fast polling if not already running
  if (!fastPollingInterval) {
    startFastPolling();
  }
}

/**
 * Start fast polling interval
 */
function startFastPolling() {
  if (fastPollingInterval) {
    return;
  }

  // Run immediately
  checkPendingCheckouts();

  // Then run every minute
  fastPollingInterval = setInterval(
    checkPendingCheckouts,
    stripeConfig.polling.fastInterval
  );

  logger.info(
    `Started fast subscription polling (every ${stripeConfig.polling.fastInterval / 1000}s)`
  );
}

/**
 * Stop fast polling for a specific user
 * @param {string} discordId - Discord user ID
 */
function stopFastPolling(discordId) {
  pendingCheckouts.delete(discordId);
  logger.info(`Removed Discord user ${discordId} from fast polling queue`);

  // Stop fast polling if no more pending checkouts
  if (pendingCheckouts.size === 0 && fastPollingInterval) {
    clearInterval(fastPollingInterval);
    fastPollingInterval = null;
    logger.info("Stopped fast polling - no more pending checkouts");
  }
}

/**
 * Check pending checkouts (fast polling)
 */
async function checkPendingCheckouts() {
  if (pendingCheckouts.size === 0) {
    return;
  }

  logger.debug(`Checking ${pendingCheckouts.size} pending checkouts`);

  const now = Date.now();
  const expiredUsers = [];

  for (const [discordId, checkoutData] of pendingCheckouts.entries()) {
    const { sessionId, createdAt } = checkoutData;

    // Check if fast polling duration exceeded
    if (now - createdAt > stripeConfig.polling.fastDuration) {
      const durationMinutes = stripeConfig.polling.fastDuration / 60000;
      logger.info(
        `Fast polling expired for Discord user ${discordId} after ${durationMinutes} minutes`
      );
      expiredUsers.push(discordId);
      continue;
    }

    // Check the checkout session status
    const sessionResult = await stripeService.getCheckoutSession(sessionId);

    if (sessionResult.success && sessionResult.paid) {
      logger.info(
        `Payment detected for Discord user ${discordId} - processing subscription`
      );

      // Process the new subscription
      await processNewSubscription(sessionResult);

      // Remove from fast polling
      expiredUsers.push(discordId);
    }
  }

  // Clean up expired/processed users
  for (const discordId of expiredUsers) {
    stopFastPolling(discordId);
  }
}

/**
 * Check all active subscriptions (normal polling)
 */
async function checkAllSubscriptions() {
  logger.info("Running subscription status check...");

  try {
    // Get all Stripe subscriptions
    const stripeSubscriptions = await stripeService.getAllActiveSubscriptions();

    // Get all users from database
    const dbUsers = await database.fetchAllUsers();

    // Create a map of Discord IDs to database users
    const dbUserMap = new Map(
      dbUsers.map((user) => [user.discord_id, user])
    );

    // Process Stripe subscriptions
    for (const stripeSub of stripeSubscriptions) {
      const { discordId, status, subscriptionId, currentPeriodEnd, customerId } = stripeSub;

      const dbUser = dbUserMap.get(discordId);

      if (!dbUser) {
        // User exists in Stripe but not in our database - sync them
        logger.info(
          `Found Stripe subscription ${subscriptionId} without database record - syncing user ${discordId}`
        );

        // Create database entry for this subscriber
        await syncStripeSubscriber(discordId, customerId, subscriptionId, status, currentPeriodEnd);
        continue;
      }

      // Check if user has no subscription info but has a Stripe subscription
      if (!dbUser.stripe_subscription_id && subscriptionId) {
        logger.info(
          `User ${discordId} exists but missing Stripe info - updating`
        );
        await database.updateUserSubscription(discordId, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: status,
          subscriptionEndsAt: currentPeriodEnd,
        });
        
        // Ensure they have roles
        if (status === "active") {
          await assignSubscriptionRoles(discordId);
        }
        continue;
      }

      // Check if status changed
      if (dbUser.subscription_status !== status) {
        logger.info(
          `Subscription status changed for ${discordId}: ${dbUser.subscription_status} -> ${status}`
        );

        await handleSubscriptionStatusChange(discordId, dbUser, status, currentPeriodEnd);
      }
    }

    // Check for legacy users with expiring grace period
    await checkLegacyUserExpiry();

    logger.info("Subscription status check completed");
  } catch (error) {
    logger.error(`Error in subscription check: ${error.message}`);
  }
}

/**
 * Sync a Stripe subscriber who doesn't exist in our database
 * This handles cases where the bot was down when someone subscribed
 * @param {string} discordId - Discord user ID
 * @param {string} customerId - Stripe customer ID
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {string} status - Subscription status
 * @param {Date} currentPeriodEnd - Subscription period end date
 */
async function syncStripeSubscriber(discordId, customerId, subscriptionId, status, currentPeriodEnd) {
  try {
    // Fetch Discord user info
    const discordUser = await fetchDiscordUser(discordId);

    if (!discordUser) {
      logger.warn(`Could not fetch Discord user ${discordId} for sync`);
      return;
    }

    // Save to database
    await database.saveSubscriptionUser({
      discordId,
      discordUsername: discordUser.tag,
      firstName: "",
      lastName: "",
      email: "",
      projectName: null,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: status,
      subscriptionEndsAt: currentPeriodEnd,
    });

    // Assign roles if active
    if (status === "active") {
      await assignSubscriptionRoles(discordId);
      await sendSubscriptionWelcomeDM(discordId);
    }

    logger.info(`Successfully synced Stripe subscriber ${discordId}`);
  } catch (error) {
    logger.error(`Error syncing Stripe subscriber: ${error.message}`);
  }
}

/**
 * Process a new subscription after successful payment
 * @param {Object} sessionData - Checkout session data
 */
async function processNewSubscription(sessionData) {
  const {
    discordId,
    customerId,
    customerEmail,
    subscriptionId,
    subscriptionStatus,
    currentPeriodEnd,
  } = sessionData;

  try {
    // Check if user already exists in database
    let user = await database.getUserByDiscordId(discordId);

    if (user) {
      // Update existing user with subscription info
      await database.updateUserSubscription(discordId, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: subscriptionStatus,
        subscriptionEndsAt: currentPeriodEnd,
      });
    } else {
      // Get Discord user info
      const discordUser = await fetchDiscordUser(discordId);

      // Create new user with subscription info
      await database.saveSubscriptionUser({
        discordId,
        discordUsername: discordUser?.tag || `User#${discordId}`,
        firstName: "",
        lastName: "",
        email: customerEmail || "",
        projectName: null,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: subscriptionStatus,
        subscriptionEndsAt: currentPeriodEnd,
      });
    }

    // Assign access roles
    await assignSubscriptionRoles(discordId);

    // Send welcome DM
    await sendSubscriptionWelcomeDM(discordId);

    logger.info(`Successfully processed new subscription for Discord user ${discordId}`);
  } catch (error) {
    logger.error(`Error processing new subscription: ${error.message}`);
  }
}

/**
 * Handle subscription status change
 * @param {string} discordId - Discord user ID
 * @param {Object} dbUser - Database user record
 * @param {string} newStatus - New subscription status
 * @param {Date} currentPeriodEnd - Subscription period end date
 */
async function handleSubscriptionStatusChange(discordId, dbUser, newStatus, currentPeriodEnd) {
  try {
    // Update database
    await database.updateUserSubscription(discordId, {
      subscriptionStatus: newStatus,
      subscriptionEndsAt: currentPeriodEnd,
    });

    switch (newStatus) {
      case "active":
        // Subscription reactivated - ensure roles are assigned
        await assignSubscriptionRoles(discordId);
        await sendSubscriptionActivatedDM(discordId);
        break;

      case "past_due":
        // Payment failed - send warning, start grace period
        await sendPaymentFailedDM(discordId);
        break;

      case "canceled":
      case "unpaid":
        // Subscription ended - remove access roles
        await removeSubscriptionRoles(discordId);
        await sendSubscriptionEndedDM(discordId, newStatus);
        break;

      case "trialing":
        // User is in trial (legacy users)
        logger.info(`User ${discordId} is in trial period`);
        break;

      default:
        logger.warn(`Unknown subscription status: ${newStatus}`);
    }
  } catch (error) {
    logger.error(`Error handling subscription status change: ${error.message}`);
  }
}

/**
 * Check legacy users for grace period expiry
 */
async function checkLegacyUserExpiry() {
  try {
    const legacyUsers = await database.getLegacyUsers();
    const now = new Date();

    for (const user of legacyUsers) {
      if (user.subscription_ends_at && new Date(user.subscription_ends_at) <= now) {
        logger.info(
          `Legacy user ${user.discord_id} grace period expired - removing access`
        );

        // Update status
        await database.updateUserSubscription(user.discord_id, {
          subscriptionStatus: "canceled",
          subscriptionEndsAt: now,
        });

        // Remove roles
        await removeSubscriptionRoles(user.discord_id);

        // Send notification
        await sendLegacyExpiryDM(user.discord_id);
      }
    }
  } catch (error) {
    logger.error(`Error checking legacy user expiry: ${error.message}`);
  }
}

/**
 * Assign subscription access roles to user
 * @param {string} discordId - Discord user ID
 */
async function assignSubscriptionRoles(discordId) {
  try {
    if (!discordClient) {
      logger.warn("Discord client not available for role assignment");
      return;
    }

    // Get main server guild
    const guild = discordClient.guilds.cache.get(
      process.env.GUILD_ID
    );

    if (!guild) {
      logger.error("Main guild not found for role assignment");
      return;
    }

    // Fetch the member
    const member = await guild.members.fetch(discordId).catch(() => null);

    if (!member) {
      logger.warn(`Could not find member ${discordId} in guild for role assignment`);
      return;
    }

    // Remove unverified role if present
    const unverifiedRole = guild.roles.cache.get(ROLES.UNVERIFIED);
    if (unverifiedRole && member.roles.cache.has(ROLES.UNVERIFIED)) {
      await member.roles.remove(unverifiedRole);
      logger.info(`Removed unverified role from ${member.user.tag}`);
    }

    // Determine which member role to assign based on language role
    let memberRole;
    let roleName;

    if (member.roles.cache.has(ROLES.ENGLISH)) {
      memberRole = guild.roles.cache.get(ROLES.ENGLISH_MEMBER);
      roleName = "English Member";
    } else if (member.roles.cache.has(ROLES.BOSNIAN_CROATIAN_SERBIAN)) {
      memberRole = guild.roles.cache.get(ROLES.BOSNIAN_CROATIAN_SERBIAN_MEMBER);
      roleName = "Bosnian/Croatian/Serbian Member";
    } else {
      // Fallback to legacy member role
      memberRole = guild.roles.cache.get(ROLES.MEMBER);
      roleName = "Member";
    }

    if (memberRole && !member.roles.cache.has(memberRole.id)) {
      await member.roles.add(memberRole);
      logger.info(`Assigned ${roleName} role to ${member.user.tag}`);
    }
  } catch (error) {
    logger.error(`Error assigning subscription roles: ${error.message}`);
  }
}

/**
 * Remove subscription access roles from user
 * @param {string} discordId - Discord user ID
 */
async function removeSubscriptionRoles(discordId) {
  try {
    if (!discordClient) {
      logger.warn("Discord client not available for role removal");
      return;
    }

    // Get main server guild
    const guild = discordClient.guilds.cache.get(
      process.env.GUILD_ID
    );

    if (!guild) {
      logger.error("Main guild not found for role removal");
      return;
    }

    // Fetch the member
    const member = await guild.members.fetch(discordId).catch(() => null);

    if (!member) {
      logger.warn(`Could not find member ${discordId} in guild for role removal`);
      return;
    }

    // Remove all member roles
    const memberRoles = [
      ROLES.MEMBER,
      ROLES.ENGLISH_MEMBER,
      ROLES.BOSNIAN_CROATIAN_SERBIAN_MEMBER,
    ];

    for (const roleId of memberRoles) {
      if (member.roles.cache.has(roleId)) {
        const role = guild.roles.cache.get(roleId);
        if (role) {
          await member.roles.remove(role);
          logger.info(`Removed ${role.name} role from ${member.user.tag}`);
        }
      }
    }

    // Add unverified role back
    const unverifiedRole = guild.roles.cache.get(ROLES.UNVERIFIED);
    if (unverifiedRole && !member.roles.cache.has(ROLES.UNVERIFIED)) {
      await member.roles.add(unverifiedRole);
      logger.info(`Added unverified role to ${member.user.tag}`);
    }
  } catch (error) {
    logger.error(`Error removing subscription roles: ${error.message}`);
  }
}

/**
 * Fetch Discord user by ID
 * @param {string} discordId - Discord user ID
 * @returns {Object|null} - Discord user or null
 */
async function fetchDiscordUser(discordId) {
  try {
    if (!discordClient) {
      return null;
    }

    return await discordClient.users.fetch(discordId);
  } catch (error) {
    logger.error(`Error fetching Discord user: ${error.message}`);
    return null;
  }
}

/**
 * Send subscription welcome DM (Bosnian without diacritics)
 * @param {string} discordId - Discord user ID
 */
async function sendSubscriptionWelcomeDM(discordId) {
  try {
    const user = await fetchDiscordUser(discordId);
    if (!user) return;

    await user.send(
      `🎉 **Dobrodosli u Seolaxy!**\n\n` +
      `Vasa pretplata je sada aktivna i dobili ste pristup svim clanskim kanalima.\n\n` +
      `Hvala vam na podrsci! Ako imate bilo kakvih pitanja, slobodno se obratite nasem osoblju.\n\n` +
      `Uzivajte u clanstvu! 🚀`
    );

    logger.info(`Sent welcome DM to ${user.tag}`);
  } catch (error) {
    logger.warn(`Could not send welcome DM to ${discordId}: ${error.message}`);
  }
}

/**
 * Send subscription activated DM (Bosnian without diacritics)
 * @param {string} discordId - Discord user ID
 */
async function sendSubscriptionActivatedDM(discordId) {
  try {
    const user = await fetchDiscordUser(discordId);
    if (!user) return;

    await user.send(
      `✅ **Pretplata ponovo aktivirana!**\n\n` +
      `Vasa pretplata je ponovo aktivna i vas pristup je vracen.\n\n` +
      `Hvala vam sto nastavljate clanstvo! 🎉`
    );

    logger.info(`Sent reactivation DM to ${user.tag}`);
  } catch (error) {
    logger.warn(`Could not send reactivation DM to ${discordId}: ${error.message}`);
  }
}

/**
 * Send payment failed DM (Bosnian without diacritics)
 * @param {string} discordId - Discord user ID
 */
async function sendPaymentFailedDM(discordId) {
  try {
    const user = await fetchDiscordUser(discordId);
    if (!user) return;

    await user.send(
      `⚠️ **Problem sa placanjem**\n\n` +
      `Nismo mogli obraditi vase placanje pretplate. Molimo azurirajte nacin placanja kako biste izbjegli gubitak pristupa.\n\n` +
      `Imate ${stripeConfig.gracePeriodDays} dana da rijesite ovaj problem.\n\n` +
      `Ako vam treba pomoc, molimo kontaktirajte nase osoblje.`
    );

    logger.info(`Sent payment failed DM to ${user.tag}`);
  } catch (error) {
    logger.warn(`Could not send payment failed DM to ${discordId}: ${error.message}`);
  }
}

/**
 * Send subscription ended DM (Bosnian without diacritics)
 * @param {string} discordId - Discord user ID
 * @param {string} reason - Reason for subscription end
 */
async function sendSubscriptionEndedDM(discordId, reason) {
  try {
    const user = await fetchDiscordUser(discordId);
    if (!user) return;

    const reasonText = reason === "canceled" 
      ? "Vasa pretplata je otkazana."
      : "Vasa pretplata je zavrsena zbog problema sa placanjem.";

    await user.send(
      `😔 **Pretplata zavrsena**\n\n` +
      `${reasonText}\n\n` +
      `Vase uloge pristupa su uklonjene. Da biste ponovo dobili pristup, molimo pretplatite se koristeci dugme za pretplatu na serveru.\n\n` +
      `Nadamo se da cemo vas uskoro ponovo vidjeti! 💙`
    );

    logger.info(`Sent subscription ended DM to ${user.tag}`);
  } catch (error) {
    logger.warn(`Could not send subscription ended DM to ${discordId}: ${error.message}`);
  }
}

/**
 * Send legacy user expiry DM (Bosnian without diacritics)
 * @param {string} discordId - Discord user ID
 */
async function sendLegacyExpiryDM(discordId) {
  try {
    const user = await fetchDiscordUser(discordId);
    if (!user) return;

    await user.send(
      `⏰ **Period besplatnog pristupa je zavrsen**\n\n` +
      `Vas jednomjesecni besplatni pristup je zavrsen. Presli smo na model pretplate.\n\n` +
      `Da biste nastavili uzivati pristup svim clanskim kanalima, molimo pretplatite se koristeci dugme na serveru.\n\n` +
      `Hvala vam sto ste dio nase zajednice! 💙`
    );

    logger.info(`Sent legacy expiry DM to ${user.tag}`);
  } catch (error) {
    logger.warn(`Could not send legacy expiry DM to ${discordId}: ${error.message}`);
  }
}

/**
 * Get pending checkouts count
 * @returns {number} - Number of pending checkouts
 */
function getPendingCheckoutsCount() {
  return pendingCheckouts.size;
}

/**
 * Check if user has pending checkout
 * @param {string} discordId - Discord user ID
 * @returns {boolean} - True if user has pending checkout
 */
function hasPendingCheckout(discordId) {
  return pendingCheckouts.has(discordId);
}

module.exports = {
  init,
  startPolling,
  stopPolling,
  triggerFastPolling,
  stopFastPolling,
  checkAllSubscriptions,
  checkPendingCheckouts,
  assignSubscriptionRoles,
  removeSubscriptionRoles,
  processNewSubscription,
  getPendingCheckoutsCount,
  hasPendingCheckout,
};
