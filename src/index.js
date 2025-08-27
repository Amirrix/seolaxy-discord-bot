/**
 * Seolaxy Discord Bot
 * Main entry point for the Discord bot
 *
 * @author Seolaxy Team
 * @version 2.0.0
 */

const { Client, GatewayIntentBits, Events } = require("discord.js");
require("dotenv").config();

// Configuration and Constants
const discordConfig = require("./config/discord");
const channels = require("./constants/channels");

// Services
const database = require("./services/database");

// Handlers
const { handleCommand } = require("./handlers/commands");
const { handleButton, updateUsersEmbed } = require("./handlers/buttons");
const { handleModal } = require("./handlers/modals");

// Components
const { createJoinEmbed } = require("./components/embeds");
const { createJoinButton } = require("./components/buttons");

// Utilities
const logger = require("./utils/logger");
const { validateConfig } = require("./utils/validation");

// Import command deployment function
const { deployCommands } = require("../scripts/deploy-commands");

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

// Make client available to other modules
module.exports = { client };

/**
 * Send join message to specified channel
 * @param {TextChannel} channel - Discord channel to send message to
 */
async function sendJoinMessage(channel) {
  const embed = createJoinEmbed();
  const row = createJoinButton();

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

// Event: Bot is ready
client.once(Events.ClientReady, async (readyClient) => {
  logger.info(`🎉 Bot is ready! Logged in as ${readyClient.user.tag}`);
  logger.info(`🌐 Connected to ${readyClient.guilds.cache.size} guild(s)`);

  // Initialize database connection
  await database.initDatabase();

  // Set bot activity status
  client.user.setActivity(discordConfig.activity.name, {
    type: discordConfig.activity.type,
  });

  // Send join message to the specified channel
  try {
    const joinChannel = await client.channels.fetch(channels.JOIN_CHANNEL_ID);
    if (joinChannel) {
      await sendJoinMessage(joinChannel);
      logger.info(`✅ Join message sent to channel #${joinChannel.name}`);
    } else {
      logger.error(
        `❌ Could not find channel with ID: ${channels.JOIN_CHANNEL_ID}`
      );
    }
  } catch (error) {
    logger.error(`❌ Error sending join message: ${error.message}`);
  }

  // Initialize users embed in users channel
  await updateUsersEmbed();
});

// Event: Handle interactions (commands, buttons, modals)
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    }
  } catch (error) {
    logger.error(`Error handling interaction: ${error.message}`);
    logger.error("Stack:", error.stack);
  }
});

// Global error handlers
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error.message);
  logger.error("Stack:", error.stack);
  process.exit(1);
});

/**
 * Start the bot
 */
async function startBot() {
  try {
    logger.info("🚀 Starting Seolaxy Discord Bot...");

    // Validate configuration
    validateConfig();

    // Auto-deploy commands on startup
    logger.info("📋 Auto-deploying slash commands...");
    await deployCommands();
    logger.info("✅ Commands deployed successfully!");

    // Login to Discord
    await client.login(discordConfig.bot.token);
  } catch (error) {
    logger.error(`Failed to start bot: ${error.message}`);
    process.exit(1);
  }
}

// Start the bot if this file is run directly
if (require.main === module) {
  startBot();
}

module.exports = {
  client,
  startBot,
  sendJoinMessage,
};
