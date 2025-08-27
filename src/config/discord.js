/**
 * Discord Configuration
 * Centralizes all Discord-related configuration
 */

module.exports = {
  // Bot configuration
  bot: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    logLevel: process.env.LOG_LEVEL || "info",
  },

  // Discord intents
  intents: ["Guilds", "GuildMessages", "GuildMembers"],

  // Bot activity
  activity: {
    name: "for new members",
    type: "WATCHING",
  },
};
