/**
 * Seolaxy API Configuration
 * Centralizes all API-related configuration
 */

module.exports = {
  baseURL:
    process.env.SEOLAXY_API_BASE_URL ||
    "https://dev.mentorship.seolaxy.com/api/open-api",
  bearerToken: process.env.SEOLAXY_API_BEARER_TOKEN,
  timeout: 10000, // 10 seconds timeout

  endpoints: {
    validatePaymentIntent: "/payment-intent/validate",
  },
};
