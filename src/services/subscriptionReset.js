/**
 * Subscription Reset Service
 * Manual reset of all verified members via admin command
 * Finds members by Discord role (not DB), DMs them, removes roles, and deletes from DB
 */

const database = require("./database");
const stripeService = require("./stripeService");
const ROLES = require("../constants/roles");
const logger = require("../utils/logger");

let discordClient = null;

const DELAY_BETWEEN_USERS_MS = 2000;

// Member roles that indicate a verified/active user
const MEMBER_ROLE_IDS = [
  ROLES.MEMBER,
  ROLES.ENGLISH_MEMBER,
  ROLES.BOSNIAN_CROATIAN_SERBIAN_MEMBER,
];

/**
 * Initialize the subscription reset service
 * @param {Client} client - Discord client
 */
function init(client) {
  discordClient = client;
}

/**
 * Execute the subscription reset
 * Finds all guild members with verified roles, DMs them, removes roles, adds UNVERIFIED, deletes from DB
 * @returns {Object} Result with successCount, errorCount, and totalCount
 */
async function executeReset() {
  logger.info("=== STARTING SUBSCRIPTION RESET ===");

  if (!discordClient) {
    throw new Error("Discord client not initialized");
  }

  const guild = discordClient.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) {
    throw new Error("Main guild not found");
  }

  // Fetch all guild members to ensure cache is populated
  await guild.members.fetch();

  // Find all members who have any of the member roles
  const membersToReset = guild.members.cache.filter((member) =>
    MEMBER_ROLE_IDS.some((roleId) => member.roles.cache.has(roleId))
  );

  const totalCount = membersToReset.size;
  logger.info(`Found ${totalCount} members with verified roles to reset`);

  if (totalCount === 0) {
    logger.info("No verified members found");
    return { successCount: 0, errorCount: 0, totalCount: 0 };
  }

  let successCount = 0;
  let errorCount = 0;

  const unverifiedRole = guild.roles.cache.get(ROLES.UNVERIFIED);

  for (const [, member] of membersToReset) {
    try {
      logger.info(
        `Processing reset for ${member.user.tag} (${member.id})`
      );

      // 1. Cancel Stripe subscription if user exists in DB
      try {
        const dbUser = await database.getUserByDiscordId(member.id);
        if (dbUser && dbUser.stripe_subscription_id) {
          try {
            await stripeService.cancelSubscription(
              dbUser.stripe_subscription_id,
              true
            );
            logger.info(
              `Cancelled Stripe subscription ${dbUser.stripe_subscription_id} for ${member.user.tag}`
            );
          } catch (stripeError) {
            logger.error(
              `Failed to cancel Stripe sub for ${member.user.tag}: ${stripeError.message}`
            );
          }
        }
      } catch (dbLookupError) {
        logger.error(
          `Failed DB lookup for ${member.user.tag}: ${dbLookupError.message}`
        );
      }

      // 2. Remove all member roles
      for (const roleId of MEMBER_ROLE_IDS) {
        if (member.roles.cache.has(roleId)) {
          const role = guild.roles.cache.get(roleId);
          if (role) {
            await member.roles.remove(role);
            logger.info(`Removed ${role.name} role from ${member.user.tag}`);
          }
        }
      }

      // 3. Add UNVERIFIED role back
      if (unverifiedRole && !member.roles.cache.has(ROLES.UNVERIFIED)) {
        await member.roles.add(unverifiedRole);
        logger.info(`Added unverified role to ${member.user.tag}`);
      }

      // 4. Delete user from DB if they exist
      try {
        await database.deleteUser(member.id);
        logger.info(`Deleted DB entry for ${member.user.tag}`);
      } catch (dbError) {
        logger.error(
          `Failed to delete DB entry for ${member.user.tag}: ${dbError.message}`
        );
      }

      // 5. Send DM notification
      try {
        await sendResetNotificationDM(member.id);
        logger.info(`Sent reset DM to ${member.user.tag}`);
      } catch (dmError) {
        logger.error(
          `Failed to send DM to ${member.user.tag}: ${dmError.message}`
        );
      }

      successCount++;
    } catch (userError) {
      errorCount++;
      logger.error(
        `Error processing reset for ${member.user.tag}: ${userError.message}`
      );
    }

    // Rate limiting delay between users
    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_USERS_MS));
  }

  logger.info("=== SUBSCRIPTION RESET COMPLETED ===");
  logger.info(
    `Results: ${successCount} successful, ${errorCount} errors out of ${totalCount} users`
  );

  return { successCount, errorCount, totalCount };
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
  executeReset,
};
