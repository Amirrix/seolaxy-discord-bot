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
const subscriptionService = require("./services/subscriptionService");

// Handlers
const { handleCommand } = require("./handlers/commands");
const {
  handleButton,
  updateUsersEmbed,
  updateMentorship2UsersEmbed,
  resetUsersEmbedState,
  resetMentorship2UsersEmbedState,
} = require("./handlers/buttons");
const { handleModal } = require("./handlers/modals");

// Components
const {
  createJoinEmbed,
  createSecondServerJoinEmbed,
  createSubscribeEmbed,
  createEnglishSubscribeEmbed,
  createMentorship2JoinEmbed,
} = require("./components/embeds");
const {
  createJoinButton,
  createSecondServerJoinButton,
  createSubscribeButton,
  createSecondServerSubscribeButton,
  createMentorship2JoinButton,
} = require("./components/buttons");

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
 * Clean up previous bot messages in specified channels
 * @param {Array} channelIds - Array of channel IDs to clean
 */
async function cleanupPreviousMessages(channelIds) {
  for (const channelId of channelIds) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        logger.warn(`Could not find channel with ID: ${channelId} for cleanup`);
        continue;
      }

      // Fetch recent messages (last 100)
      const messages = await channel.messages.fetch({ limit: 100 });

      // Filter messages sent by this bot
      const botMessages = messages.filter(
        (message) => message.author.id === client.user.id
      );

      if (botMessages.size > 0) {
        // Delete bot messages
        for (const message of botMessages.values()) {
          try {
            await message.delete();
            logger.debug(
              `Deleted previous bot message in channel ${channel.name}`
            );
          } catch (deleteError) {
            // Message might already be deleted or we don't have permissions
            logger.debug(`Could not delete message: ${deleteError.message}`);
          }
        }
        logger.info(
          `Cleaned up ${botMessages.size} previous bot messages in #${channel.name}`
        );
      }
    } catch (error) {
      logger.error(`Error cleaning up channel ${channelId}: ${error.message}`);
    }
  }
}

/**
 * Send subscribe message to specified channel (main server)
 * @param {TextChannel} channel - Discord channel to send message to
 */
async function sendSubscribeMessage(channel) {
  const embed = createSubscribeEmbed();
  const row = createSubscribeButton();

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

/**
 * Send subscribe message to second server (English server)
 * @param {TextChannel} channel - Discord channel to send message to
 */
async function sendSecondServerSubscribeMessage(channel) {
  const embed = createEnglishSubscribeEmbed();
  const row = createSecondServerSubscribeButton();

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

// Legacy functions (kept for backward compatibility)
/**
 * Send join message to specified channel (legacy - uses subscribe now)
 * @param {TextChannel} channel - Discord channel to send message to
 */
async function sendJoinMessage(channel) {
  return sendSubscribeMessage(channel);
}

/**
 * Send second server join message to specified channel (legacy)
 * @param {TextChannel} channel - Discord channel to send message to
 */
async function sendSecondServerJoinMessage(channel) {
  return sendSecondServerSubscribeMessage(channel);
}

/**
 * Send Mentorship #2 join message to specified channel (Croatian)
 * @param {TextChannel} channel - Discord channel to send message to
 */
async function sendMentorship2JoinMessage(channel) {
  const embed = createMentorship2JoinEmbed();
  const row = createMentorship2JoinButton();

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

  // Initialize subscription service
  subscriptionService.init(client);
  subscriptionService.startPolling();
  logger.info("💳 Subscription polling service started");

  // Set bot activity status
  client.user.setActivity(discordConfig.activity.name, {
    type: discordConfig.activity.type,
  });

  // Clean up previous bot messages in key channels
  logger.info("🧹 Cleaning up previous bot messages...");
  await cleanupPreviousMessages([
    channels.JOIN_CHANNEL_ID,
    channels.USERS_CHANNEL_ID,
  ]);

  // Reset users embed state after cleanup
  resetUsersEmbedState();

  // Send subscribe message to the specified channel
  try {
    const joinChannel = await client.channels.fetch(channels.JOIN_CHANNEL_ID);
    if (joinChannel) {
      await sendSubscribeMessage(joinChannel);
      logger.info(`✅ Subscribe message sent to channel #${joinChannel.name}`);
    } else {
      logger.error(
        `❌ Could not find channel with ID: ${channels.JOIN_CHANNEL_ID}`
      );
    }
  } catch (error) {
    logger.error(`❌ Error sending subscribe message: ${error.message}`);
  }

  // Initialize users embed in users channel
  await updateUsersEmbed();

  // Initialize second server if configured
  if (channels.SECOND_SERVER_ID && channels.SECOND_SERVER_JOIN_CHANNEL_ID) {
    try {
      const secondServer = await client.guilds.fetch(channels.SECOND_SERVER_ID);
      if (secondServer) {
        logger.info(`📡 Found second server: ${secondServer.name}`);

        const secondServerJoinChannel = await secondServer.channels.fetch(
          channels.SECOND_SERVER_JOIN_CHANNEL_ID
        );
        if (secondServerJoinChannel) {
          // Clean up previous bot messages
          try {
            const messages = await secondServerJoinChannel.messages.fetch({
              limit: 10,
            });
            const botMessages = messages.filter(
              (msg) => msg.author.id === client.user.id
            );

            for (const message of botMessages.values()) {
              try {
                await message.delete();
                logger.info(`🗑️ Deleted previous bot message in second server`);
              } catch (deleteError) {
                logger.warn(
                  `Could not delete message in second server: ${deleteError.message}`
                );
              }
            }
          } catch (fetchError) {
            logger.warn(
              `Could not fetch messages for cleanup in second server: ${fetchError.message}`
            );
          }

          // Send subscribe message to second server
          await sendSecondServerSubscribeMessage(secondServerJoinChannel);
          logger.info(
            `✅ Subscribe message sent to second server channel #${secondServerJoinChannel.name}`
          );
        } else {
          logger.error(
            `❌ Could not find join channel in second server with ID: ${channels.SECOND_SERVER_JOIN_CHANNEL_ID}`
          );
        }
      } else {
        logger.error(
          `❌ Could not find second server with ID: ${channels.SECOND_SERVER_ID}`
        );
      }
    } catch (error) {
      logger.error(`❌ Error initializing second server: ${error.message}`);
    }
  } else {
    logger.info("📝 Second server not configured, skipping initialization");
  }

  // Initialize Mentorship #2 server
  if (channels.MENTORSHIP2_JOIN_CHANNEL_ID) {
    try {
      logger.info("📡 Initializing Mentorship #2 server...");

      // Clean up previous bot messages in Mentorship #2 channels
      await cleanupPreviousMessages([
        channels.MENTORSHIP2_JOIN_CHANNEL_ID,
        channels.MENTORSHIP2_USERS_CHANNEL_ID,
      ]);

      // Reset Mentorship #2 users embed state after cleanup
      resetMentorship2UsersEmbedState();

      // Send join message to Mentorship #2 join channel
      const m2JoinChannel = await client.channels.fetch(
        channels.MENTORSHIP2_JOIN_CHANNEL_ID
      );
      if (m2JoinChannel) {
        await sendMentorship2JoinMessage(m2JoinChannel);
        logger.info(
          `✅ Mentorship #2 join message sent to channel #${m2JoinChannel.name}`
        );
      } else {
        logger.error(
          `❌ Could not find Mentorship #2 join channel with ID: ${channels.MENTORSHIP2_JOIN_CHANNEL_ID}`
        );
      }

      // Initialize Mentorship #2 users embed
      await updateMentorship2UsersEmbed();
      logger.info("✅ Mentorship #2 server initialized successfully");
    } catch (error) {
      logger.error(
        `❌ Error initializing Mentorship #2 server: ${error.message}`
      );
    }
  } else {
    logger.info(
      "📝 Mentorship #2 server not configured, skipping initialization"
    );
  }
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
  sendSubscribeMessage,
  sendSecondServerSubscribeMessage,
  sendMentorship2JoinMessage,
  cleanupPreviousMessages,
};
