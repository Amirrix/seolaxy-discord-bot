/**
 * Validation Utilities
 * Centralizes validation logic
 */

const logger = require("./logger");

/**
 * Validates required environment variables
 * @param {string[]} required - Array of required environment variable names
 */
function validateConfig(required = []) {
  const defaultRequired = [
    "DISCORD_TOKEN",
    "CLIENT_ID",
    "GUILD_ID",
    "SEOLAXY_API_BEARER_TOKEN",
  ];

  const allRequired = [...defaultRequired, ...required];
  const missing = allRequired.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
    logger.error(
      "Please check your .env file and ensure all required variables are set."
    );
    process.exit(1);
  }

  logger.info("Configuration validated successfully");
}

module.exports = {
  validateConfig,
};
