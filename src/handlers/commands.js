/**
 * Command Handlers
 * Handles Discord slash command interactions
 */

const logger = require("../utils/logger");
const database = require("../services/database");
const stripeService = require("../services/stripeService");
const subscriptionService = require("../services/subscriptionService");
const subscriptionReset = require("../services/subscriptionReset");

/**
 * Handle hello command
 * @param {Interaction} interaction - Discord interaction
 */
async function handleHelloCommand(interaction) {
  const user = interaction.user;
  logger.info(`Hello command used by ${user.tag}`);

  await interaction.reply({
    content: `👋 Hello world! Nice to meet you, ${user.displayName}!`,
    ephemeral: false, // Set to true if you want only the user to see the response
  });
}

/**
 * Handle test-reset command - performs subscription reset on the invoking user
 * @param {Interaction} interaction - Discord interaction
 */
async function handleTestResetCommand(interaction) {
  const discordId = interaction.user.id;
  logger.info(`Test-reset command used by ${interaction.user.tag} (${discordId})`);

  await interaction.deferReply({ flags: 64 });

  // Check if user exists in DB with an active subscription
  const dbUser = await database.getUserByDiscordId(discordId);
  if (!dbUser) {
    await interaction.editReply({ content: "You are not in the database." });
    return;
  }

  // Even if subscription data is already cleared, still delete the user
  // so they can go through fresh registration

  const results = [];

  // 1. Cancel Stripe subscription
  if (dbUser.stripe_subscription_id) {
    try {
      await stripeService.cancelSubscription(dbUser.stripe_subscription_id, true);
      results.push("Stripe subscription cancelled");
    } catch (err) {
      results.push(`Stripe cancel failed: ${err.message}`);
      logger.error(`Test-reset Stripe cancel failed for ${discordId}: ${err.message}`);
    }
  } else {
    results.push("No Stripe subscription to cancel");
  }

  // 2. Remove Discord roles (adds UNVERIFIED back)
  try {
    await subscriptionService.removeSubscriptionRoles(discordId);
    results.push("Roles removed, UNVERIFIED added");
  } catch (err) {
    results.push(`Role removal failed: ${err.message}`);
    logger.error(`Test-reset role removal failed for ${discordId}: ${err.message}`);
  }

  // 3. Delete user from DB entirely so they can re-register fresh
  try {
    await database.deleteUser(discordId);
    results.push("User deleted from database");
  } catch (err) {
    results.push(`DB delete failed: ${err.message}`);
    logger.error(`Test-reset DB delete failed for ${discordId}: ${err.message}`);
  }

  // 4. Send DM notification
  try {
    const user = await interaction.client.users.fetch(discordId);
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
          footer: { text: "Seolaxy Mentorship" },
        },
      ],
    });
    results.push("DM sent");
  } catch (err) {
    results.push(`DM failed: ${err.message}`);
    logger.error(`Test-reset DM failed for ${discordId}: ${err.message}`);
  }

  await interaction.editReply({
    content: `**Test reset completed:**\n${results.map((r) => `• ${r}`).join("\n")}`,
  });
}

/**
 * Handle test-mode command - toggle Stripe between test and live mode (admin only)
 * @param {Interaction} interaction - Discord interaction
 */
async function handleTestModeCommand(interaction) {
  logger.info(`Test-mode command used by ${interaction.user.tag}`);

  const currentlyTest = stripeService.getIsTestMode();

  if (currentlyTest) {
    const success = stripeService.switchToLiveMode();
    await interaction.reply({
      content: success
        ? "Switched to **LIVE** mode. Stripe is now using live keys."
        : "Failed to switch to live mode. Check logs.",
      flags: 64,
    });
  } else {
    const success = stripeService.switchToTestMode();
    await interaction.reply({
      content: success
        ? "Switched to **TEST** mode. Stripe is now using test keys."
        : "Failed to switch to test mode. Check that STRIPE_TEST_SECRET_KEY is set.",
      flags: 64,
    });
  }
}

/**
 * Handle reset-all command - resets all active subscriptions (admin only)
 * Cancels Stripe subs, removes roles, deletes from DB, and DMs all verified users
 * @param {Interaction} interaction - Discord interaction
 */
async function handleResetAllCommand(interaction) {
  logger.info(`Reset-all command used by ${interaction.user.tag}`);

  await interaction.deferReply({ flags: 64 });

  try {
    const result = await subscriptionReset.executeReset();

    if (result.totalCount === 0) {
      await interaction.editReply({
        content: "No active subscribers found to reset.",
      });
    } else {
      await interaction.editReply({
        content:
          `**Subscription reset completed:**\n` +
          `• Total users: ${result.totalCount}\n` +
          `• Successful: ${result.successCount}\n` +
          `• Errors: ${result.errorCount}`,
      });
    }
  } catch (error) {
    logger.error(`Reset-all command error: ${error.message}`);
    await interaction.editReply({
      content: `Reset failed: ${error.message}`,
    });
  }
}

/**
 * Handle unknown command
 * @param {Interaction} interaction - Discord interaction
 */
async function handleUnknownCommand(interaction) {
  logger.warn(
    `Unknown command: ${interaction.commandName} by ${interaction.user.tag}`
  );

  await interaction.reply({
    content: "❌ Unknown command!",
    flags: 64, // EPHEMERAL flag
  });
}

/**
 * Main command handler router
 * @param {Interaction} interaction - Discord interaction
 */
async function handleCommand(interaction) {
  try {
    switch (interaction.commandName) {
      case "hello":
        await handleHelloCommand(interaction);
        break;
      case "test-reset":
        await handleTestResetCommand(interaction);
        break;
      case "test-mode":
        await handleTestModeCommand(interaction);
        break;
      case "reset-all":
        await handleResetAllCommand(interaction);
        break;
      default:
        await handleUnknownCommand(interaction);
    }
  } catch (error) {
    logger.error(`Error handling command: ${error.message}`);

    const errorMessage = {
      content: "❌ There was an error while executing this command!",
      flags: 64, // EPHEMERAL flag
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

module.exports = {
  handleCommand,
  handleHelloCommand,
  handleTestResetCommand,
  handleTestModeCommand,
  handleResetAllCommand,
  handleUnknownCommand,
};
