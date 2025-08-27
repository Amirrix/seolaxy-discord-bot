/**
 * Seolaxy API Service
 * Handles all API calls to Seolaxy services
 */

const apiConfig = require("../config/api");
const logger = require("../utils/logger");

/**
 * Validate payment intent using Seolaxy API
 * @param {string} paymentIntentId - Payment intent ID to validate
 * @returns {boolean} - Validation result
 */
async function validatePaymentIntent(paymentIntentId) {
  logger.info(`Validating payment intent: ${paymentIntentId}`);

  try {
    const url = `${apiConfig.baseURL}${
      apiConfig.endpoints.validatePaymentIntent
    }?payment_intent_id=${encodeURIComponent(paymentIntentId)}`;

    // Check if bearer token is configured
    if (!apiConfig.bearerToken) {
      logger.error(
        "Seolaxy API bearer token not configured - check SEOLAXY_API_BEARER_TOKEN environment variable"
      );
      return false;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiConfig.bearerToken}`,
        "Content-Type": "application/json",
        "User-Agent": "Seolaxy-Discord-Bot/1.0",
      },
      timeout: apiConfig.timeout,
    });

    if (!response.ok) {
      logger.error(
        `API request failed with status: ${response.status} ${response.statusText}`
      );
      return false;
    }

    const data = await response.json();
    logger.info(`Payment intent ${paymentIntentId} validation response:`, data);

    // Handle different response cases
    if (data.error === "invalid_token") {
      logger.error("Invalid API token - check bearer token configuration");
      return false;
    }

    // Return the isValid boolean from the API response
    const isValid = data.isValid === true;
    logger.info(
      `Payment intent ${paymentIntentId} validation result: ${isValid}`
    );

    return isValid;
  } catch (error) {
    logger.error(
      `Error validating payment intent ${paymentIntentId}: ${error.message}`
    );

    // In case of network errors, we'll return false to be safe
    // But we could also implement a fallback mechanism here
    return false;
  }
}

module.exports = {
  validatePaymentIntent,
};
