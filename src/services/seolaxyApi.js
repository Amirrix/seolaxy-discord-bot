/**
 * Seolaxy API Service
 * Handles all API calls to Seolaxy services
 */

const apiConfig = require("../config/api");
const logger = require("../utils/logger");

/**
 * Validate payment intent or invoice number using Seolaxy API
 * @param {string} userInput - Payment intent ID (starts with "pi") or invoice number (starts with "SM")
 * @param {string} [bearerToken] - Optional bearer token override (for Mentorship #2)
 * @returns {Object} - Validation result with success status and error details
 */
async function validatePaymentIntent(userInput, bearerToken) {
  logger.info(`Validating payment intent: ${userInput}`);

  const token = bearerToken || apiConfig.bearerToken;

  try {
    const url = `${apiConfig.baseURL}${apiConfig.endpoints.enrollDiscord}`;

    // Check if bearer token is configured
    if (!token) {
      logger.error(
        "Seolaxy API bearer token not configured"
      );
      return {
        success: false,
        error: "configuration_error",
        message:
          "Service configuration error. Please contact an administrator.",
      };
    }

    // Determine the body structure based on user input
    let requestBody;
    if (userInput.startsWith("pi")) {
      // It's a payment intent ID
      requestBody = {
        payment_intent_id: userInput,
        invoice_number: "",
      };
    } else if (userInput.startsWith("SM")) {
      // It's an invoice number
      requestBody = {
        payment_intent_id: "",
        invoice_number: userInput,
      };
    } else {
      logger.error(
        `Invalid input format: ${userInput}. Must start with "pi" or "SM"`
      );
      return {
        success: false,
        error: "invalid_format",
        message:
          "Payment intent must start with 'pi' or invoice number must start with 'SM'.",
      };
    }

    logger.info(`Sending PATCH request with body:`, requestBody);
    logger.info(`Request body JSON:`, JSON.stringify(requestBody, null, 2));
    console.log("🔍 API Request Body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "Seolaxy-Discord-Bot/1.0",
      },
      body: JSON.stringify(requestBody),
      timeout: apiConfig.timeout,
    });

    if (!response.ok) {
      logger.error(
        `API request failed with status: ${response.status} ${response.statusText}`
      );

      // Handle 409 Conflict specifically (user already enrolled)
      if (response.status === 409) {
        return {
          success: false,
          error: "already_enrolled",
          message:
            "This purchase has already been used for Discord enrollment.",
        };
      }

      // Handle 404 Not Found specifically (invoice/payment intent not found)
      if (response.status === 404) {
        return {
          success: false,
          error: "purchase_not_found",
          message:
            "No purchase found for the provided payment intent ID or invoice number.",
        };
      }

      return {
        success: false,
        error: "api_error",
        message:
          "Validation service is currently unavailable. Please try again later.",
      };
    }

    const data = await response.json();
    logger.info(`Payment intent ${userInput} validation response:`, data);

    // Handle different response cases based on the new API responses
    if (data.error === "already_enrolled") {
      logger.warn(
        `User has already enrolled to Discord with this purchase: ${userInput}`
      );
      return {
        success: false,
        error: "already_enrolled",
        message: "This purchase has already been used for Discord enrollment.",
      };
    }

    if (data.error === "purchase_not_found") {
      logger.warn(
        `No purchase found for the provided payment intent ID or invoice number: ${userInput}`
      );
      return {
        success: false,
        error: "purchase_not_found",
        message:
          "No purchase found for the provided payment intent ID or invoice number.",
      };
    }

    // Check for success response
    if (data.success === true) {
      logger.info(`Payment intent ${userInput} validation successful`);
      return {
        success: true,
        error: null,
        message: "Successfully enrolled user to Discord",
      };
    }

    // If we get here, the response format might be unexpected
    logger.warn(`Unexpected API response format for ${userInput}:`, data);
    return {
      success: false,
      error: "unexpected_response",
      message: "Unexpected response from validation service.",
    };
  } catch (error) {
    logger.error(
      `Error validating payment intent ${userInput}: ${error.message}`
    );

    // In case of network errors, we'll return false to be safe
    return {
      success: false,
      error: "network_error",
      message:
        "Network error occurred. Please check your connection and try again.",
    };
  }
}

/**
 * Validate invoice number for Mentorship #2 using dedicated JWT
 * @param {string} invoiceNumber - Invoice number (e.g., SM-XXXX/2026)
 * @returns {Object} - Validation result with success status and error details
 */
async function validateMentorship2Payment(invoiceNumber) {
  return validatePaymentIntent(invoiceNumber, apiConfig.mentorship2BearerToken);
}

module.exports = {
  validatePaymentIntent,
  validateMentorship2Payment,
};
