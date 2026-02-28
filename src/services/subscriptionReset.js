/**
 * Subscription Reset Service
 * One-time reset of all Stripe subscriptions on March 1, 2026 at 10:00 CET (09:00 UTC)
 */

const database = require("./database");
const stripeService = require("./stripeService");
const subscriptionService = require("./subscriptionService");
const logger = require("../utils/logger");

let discordClient = null;

const RESET_TARGET = new Date("2026-03-01T09:00:00.000Z"); // 10:00 CET = 09:00 UTC
const RESET_FLAG_NAME = "subscription_reset_2026_03_01";
const DELAY_BETWEEN_USERS_MS = 2000;

/**
 * Initialize the subscription reset service
 * @param {Client} client - Discord client
 */
function init(client) {
  discordClient = client;
}

/**
 * Schedule the subscription reset
 * Uses setTimeout to trigger at the target time
 */
async function scheduleReset() {
  try {
    await database.ensureBotStateTable();

    const flag = await database.getResetFlag(RESET_FLAG_NAME);
    if (flag === "completed") {
      logger.info("Subscription reset already completed, skipping schedule");
      return;
    }

    const now = Date.now();
    const targetMs = RESET_TARGET.getTime();
    const delayMs = targetMs - now;

    if (delayMs <= 0) {
      logger.info(
        "Subscription reset target time has passed, executing immediately"
      );
      executeReset();
    } else {
      const hoursUntil = (delayMs / (1000 * 60 * 60)).toFixed(1);
      logger.info(
        `Subscription reset scheduled in ${hoursUntil} hours (${RESET_TARGET.toISOString()})`
      );
      setTimeout(() => executeReset(), delayMs);
    }
  } catch (error) {
    logger.error(`Error scheduling subscription reset: ${error.message}`);
  }
}

/**
 * Execute the subscription reset
 * Cancels all Stripe subscriptions, removes roles, clears DB data, and DMs users
 */
async function executeReset() {
  try {
    logger.info("=== STARTING SUBSCRIPTION RESET ===");

    // Double-check flag to prevent duplicate execution
    const flag = await database.getResetFlag(RESET_FLAG_NAME);
    if (flag === "completed") {
      logger.info("Subscription reset already completed (flag check), aborting");
      return;
    }

    // Mark as in-progress
    await database.setResetFlag(RESET_FLAG_NAME, "in_progress");

    // Fetch all active subscribers
    const activeUsers = await database.getUsersWithActiveSubscriptions();
    logger.info(
      `Found ${activeUsers.length} active subscribers to reset`
    );

    if (activeUsers.length === 0) {
      logger.info("No active subscribers found, marking as completed");
      await database.setResetFlag(RESET_FLAG_NAME, "completed");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const user of activeUsers) {
      try {
        logger.info(
          `Processing reset for ${user.discord_username} (${user.discord_id})`
        );

        // 1. Cancel Stripe subscription
        if (user.stripe_subscription_id) {
          try {
            await stripeService.cancelSubscription(
              user.stripe_subscription_id,
              true
            );
            logger.info(
              `Cancelled Stripe subscription ${user.stripe_subscription_id} for ${user.discord_username}`
            );
          } catch (stripeError) {
            logger.error(
              `Failed to cancel Stripe sub for ${user.discord_username}: ${stripeError.message}`
            );
            // Continue anyway - don't block DB reset or role removal
          }
        }

        // 2. Remove Discord roles (adds UNVERIFIED back)
        try {
          await subscriptionService.removeSubscriptionRoles(user.discord_id);
          logger.info(`Removed roles for ${user.discord_username}`);
        } catch (roleError) {
          logger.error(
            `Failed to remove roles for ${user.discord_username}: ${roleError.message}`
          );
        }

        // 3. Reset DB subscription data
        try {
          await database.resetUserSubscriptionData(user.discord_id);
          logger.info(`Reset DB data for ${user.discord_username}`);
        } catch (dbError) {
          logger.error(
            `Failed to reset DB for ${user.discord_username}: ${dbError.message}`
          );
        }

        // 4. Send DM notification
        try {
          await sendResetNotificationDM(user.discord_id);
          logger.info(`Sent reset DM to ${user.discord_username}`);
        } catch (dmError) {
          logger.error(
            `Failed to send DM to ${user.discord_username}: ${dmError.message}`
          );
        }

        successCount++;
      } catch (userError) {
        errorCount++;
        logger.error(
          `Error processing reset for ${user.discord_username}: ${userError.message}`
        );
      }

      // Rate limiting delay between users
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_USERS_MS));
    }

    // Mark as completed
    await database.setResetFlag(RESET_FLAG_NAME, "completed");

    logger.info("=== SUBSCRIPTION RESET COMPLETED ===");
    logger.info(
      `Results: ${successCount} successful, ${errorCount} errors out of ${activeUsers.length} users`
    );
  } catch (error) {
    logger.error(`Critical error during subscription reset: ${error.message}`);
    logger.error("Stack:", error.stack);
  }
}

/**
 * Send DM notification to user about subscription reset
 * @param {string} discordId - Discord user ID
 */
async function sendResetNotificationDM(discordId) {
  if (!discordClient) {
    logger.warn("Discord client not available for reset DM");
    return;
  }

  try {
    const user = await discordClient.users.fetch(discordId);
    if (!user) {
      logger.warn(`Could not find Discord user ${discordId} for reset DM`);
      return;
    }

    await user.send({
      embeds: [
        {
          title: "Pretplata resetovana",
          description:
            "Tvoja pretplata na Seolaxy mentorship je zavrsena.\n\n" +
            "Zbog prelaska na novi sistem pretplata, potrebno je da se ponovo pretplatis.\n\n" +
            "Idi na kanal za prijavu na serveru i klikni na **Subscribe** dugme kako bi nastavio/la sa pristupom.\n\n" +
            "Hvala na razumijevanju! 💙",
          color: 0x5865f2,
          footer: {
            text: "Seolaxy Mentorship",
          },
        },
      ],
    });
  } catch (error) {
    // User may have DMs disabled
    logger.warn(`Could not send reset DM to ${discordId}: ${error.message}`);
  }
}

module.exports = {
  init,
  scheduleReset,
};
