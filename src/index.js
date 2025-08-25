const {
  Client,
  GatewayIntentBits,
  Events,
  SlashCommandBuilder,
} = require("discord.js");
require("dotenv").config();

// Create a new client instance
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Bot configuration
const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  logLevel: process.env.LOG_LEVEL || "info",
};

// Logging utility
const log = {
  info: (message) =>
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
  warn: (message) =>
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`),
  error: (message) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`),
  debug: (message) => {
    if (config.logLevel === "debug") {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
    }
  },
};

// Validate environment variables
function validateConfig() {
  const required = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    log.error(`Missing required environment variables: ${missing.join(", ")}`);
    log.error(
      "Please check your .env file and ensure all required variables are set."
    );
    process.exit(1);
  }

  log.info("Configuration validated successfully");
}

// Event: Bot is ready
client.once(Events.ClientReady, (readyClient) => {
  log.info(`🎉 Bot is ready! Logged in as ${readyClient.user.tag}`);
  log.info(`🌐 Connected to ${readyClient.guilds.cache.size} guild(s)`);

  // Set bot activity status
  client.user.setActivity("for /hello commands", { type: "WATCHING" });
});

// Event: Handle slash command interactions
client.on(Events.InteractionCreate, async (interaction) => {
  // Only handle slash commands
  if (!interaction.isChatInputCommand()) return;

  log.debug(
    `Received command: ${interaction.commandName} from ${interaction.user.tag}`
  );

  try {
    switch (interaction.commandName) {
      case "hello":
        await handleHelloCommand(interaction);
        break;

      default:
        log.warn(`Unknown command: ${interaction.commandName}`);
        await interaction.reply({
          content: "❌ Unknown command!",
          ephemeral: true,
        });
    }
  } catch (error) {
    log.error(
      `Error handling command ${interaction.commandName}: ${error.message}`
    );

    const errorMessage = {
      content: "❌ There was an error while executing this command!",
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Command handlers
async function handleHelloCommand(interaction) {
  const user = interaction.user;
  const channel = interaction.channel;

  log.info(`Hello command executed by ${user.tag} in #${channel.name}`);

  await interaction.reply({
    content: `👋 Hello world! Nice to meet you, ${user.displayName}!`,
    ephemeral: false, // Set to true if you want only the user to see the response
  });
}

// Error handling
client.on(Events.Error, (error) => {
  log.error(`Discord client error: ${error.message}`);
});

client.on(Events.Warn, (warning) => {
  log.warn(`Discord client warning: ${warning}`);
});

// Handle process termination gracefully
process.on("SIGINT", () => {
  log.info("Received SIGINT. Shutting down gracefully...");
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  log.info("Received SIGTERM. Shutting down gracefully...");
  client.destroy();
  process.exit(0);
});

// Unhandled errors
process.on("unhandledRejection", (reason, promise) => {
  log.error(`Unhandled promise rejection: ${reason}`);
  log.error("Promise:", promise);
});

process.on("uncaughtException", (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  log.error("Stack:", error.stack);
  process.exit(1);
});

// Start the bot
async function startBot() {
  try {
    log.info("🚀 Starting Seolaxy Discord Bot...");

    // Validate configuration
    validateConfig();

    // Login to Discord
    await client.login(config.token);
  } catch (error) {
    log.error(`Failed to start bot: ${error.message}`);
    process.exit(1);
  }
}

// Start the bot if this file is run directly
if (require.main === module) {
  startBot();
}

module.exports = { client, startBot };
