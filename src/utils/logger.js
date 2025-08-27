/**
 * Logging Utility
 * Provides centralized logging functionality
 */

const config = require("../config/discord");

const logger = {
  info: (message) =>
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`),

  warn: (message) =>
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`),

  error: (message) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`),

  debug: (message) => {
    if (config.bot.logLevel === "debug") {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
    }
  },
};

module.exports = logger;
