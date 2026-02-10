/**
 * Stripe Configuration
 * Contains Stripe API configuration and settings
 */

module.exports = {
  // Stripe secret key (from environment variable)
  secretKey: process.env.STRIPE_SECRET_KEY,

  // Subscription price ID (from Stripe Dashboard)
  priceId: process.env.STRIPE_PRICE_ID,

  // Checkout session settings
  checkout: {
    // URLs after checkout completion (Discord channel links work fine)
    successUrl:
      process.env.STRIPE_SUCCESS_URL ||
      "https://discord.com/channels/@me?checkout=success",
    cancelUrl:
      process.env.STRIPE_CANCEL_URL ||
      "https://discord.com/channels/@me?checkout=cancelled",

    // Allow promotion codes in checkout
    allowPromotionCodes: true,

    // Subscription mode
    mode: "subscription",
  },

  // Polling intervals (in milliseconds)
  polling: {
    // Normal polling interval (60 minutes)
    normalInterval: 60 * 60 * 1000,

    // Fast polling interval (1 minute)
    fastInterval: 60 * 1000,

    // Fast polling duration (20 minutes)
    fastDuration: 20 * 60 * 1000,
  },

  // Grace period for past_due subscriptions (in days)
  gracePeriodDays: 3,
};
