/**
 * Command Handlers
 * Handles Discord slash command interactions
 */

const logger = require("../utils/logger");
const database = require("../services/database");
const stripeService = require("../services/stripeService");
const subscriptionService = require("../services/subscriptionService");

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

  if (!dbUser.stripe_subscription_id && dbUser.subscription_status === "none") {
    await interaction.editReply({ content: "You don't have an active subscription to reset." });
    return;
  }

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

  // 3. Reset DB subscription data
  try {
    await database.resetUserSubscriptionData(discordId);
    results.push("DB subscription data cleared");
  } catch (err) {
    results.push(`DB reset failed: ${err.message}`);
    logger.error(`Test-reset DB reset failed for ${discordId}: ${err.message}`);
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
  handleUnknownCommand,
};
