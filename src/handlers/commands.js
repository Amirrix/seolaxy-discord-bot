/**
 * Command Handlers
 * Handles Discord slash command interactions
 */

const logger = require("../utils/logger");

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
  handleUnknownCommand,
};
