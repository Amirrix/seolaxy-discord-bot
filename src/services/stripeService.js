/**
 * Stripe Service
 * Handles all Stripe API interactions for subscription management
 */

const Stripe = require("stripe");
const stripeConfig = require("../config/stripe");
const logger = require("../utils/logger");

// Initialize Stripe client
let stripe = null;

/**
 * Initialize Stripe client
 * @returns {boolean} - Success status
 */
function initStripe() {
  try {
    if (!stripeConfig.secretKey) {
      logger.error("Stripe secret key not configured");
      return false;
    }

    stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: "2023-10-16",
    });

    logger.info("Stripe client initialized successfully");
    return true;
  } catch (error) {
    logger.error(`Error initializing Stripe: ${error.message}`);
    return false;
  }
}

/**
 * Create a Stripe Checkout session for subscription
 * @param {string} discordId - Discord user ID
 * @param {string} discordUsername - Discord username
 * @param {string} email - User email (optional, for prefill)
 * @returns {Object} - Checkout session data or error
 */
async function createCheckoutSession(discordId, discordUsername, email = null) {
  try {
    if (!stripe) {
      initStripe();
    }

    if (!stripe) {
      return { success: false, error: "Stripe not initialized" };
    }

    if (!stripeConfig.priceId) {
      return { success: false, error: "Stripe price ID not configured" };
    }

    const sessionParams = {
      mode: stripeConfig.checkout.mode,
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripeConfig.priceId,
          quantity: 1,
        },
      ],
      success_url: stripeConfig.checkout.successUrl,
      cancel_url: stripeConfig.checkout.cancelUrl,
      client_reference_id: discordId,
      allow_promotion_codes: stripeConfig.checkout.allowPromotionCodes,
      metadata: {
        discord_id: discordId,
        discord_username: discordUsername,
      },
      subscription_data: {
        metadata: {
          discord_id: discordId,
          discord_username: discordUsername,
        },
      },
    };

    // Prefill email if provided
    if (email) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logger.info(
      `Created checkout session ${session.id} for Discord user ${discordUsername} (${discordId})`
    );

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    logger.error(`Error creating checkout session: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get subscription status from Stripe
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Object} - Subscription data or error
 */
async function getSubscriptionStatus(subscriptionId) {
  try {
    if (!stripe) {
      initStripe();
    }

    if (!stripe) {
      return { success: false, error: "Stripe not initialized" };
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return {
      success: true,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      customerId: subscription.customer,
    };
  } catch (error) {
    logger.error(`Error getting subscription status: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get checkout session details
 * @param {string} sessionId - Stripe checkout session ID
 * @returns {Object} - Session data or error
 */
async function getCheckoutSession(sessionId) {
  try {
    if (!stripe) {
      initStripe();
    }

    if (!stripe) {
      return { success: false, error: "Stripe not initialized" };
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    if (session.payment_status === "paid" && session.subscription) {
      const subscription =
        typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;

      return {
        success: true,
        paid: true,
        discordId: session.client_reference_id,
        customerId:
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id,
        customerEmail: session.customer_details?.email,
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      };
    }

    return {
      success: true,
      paid: false,
      status: session.payment_status,
    };
  } catch (error) {
    logger.error(`Error getting checkout session: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * List recent completed checkout sessions with Discord IDs
 * @param {number} limit - Maximum number of sessions to retrieve
 * @returns {Array} - Array of completed sessions with subscription data
 */
async function listRecentCompletedCheckouts(limit = 100) {
  try {
    if (!stripe) {
      initStripe();
    }

    if (!stripe) {
      return [];
    }

    const sessions = await stripe.checkout.sessions.list({
      limit,
      expand: ["data.subscription"],
    });

    const completedSessions = [];

    for (const session of sessions.data) {
      if (
        session.payment_status === "paid" &&
        session.client_reference_id &&
        session.subscription
      ) {
        const subscription =
          typeof session.subscription === "string"
            ? await stripe.subscriptions.retrieve(session.subscription)
            : session.subscription;

        completedSessions.push({
          discordId: session.client_reference_id,
          customerId: session.customer,
          customerEmail: session.customer_details?.email,
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          createdAt: new Date(session.created * 1000),
        });
      }
    }

    return completedSessions;
  } catch (error) {
    logger.error(`Error listing recent checkouts: ${error.message}`);
    return [];
  }
}

/**
 * Cancel a subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {boolean} immediately - Cancel immediately or at period end
 * @returns {Object} - Result of cancellation
 */
async function cancelSubscription(subscriptionId, immediately = false) {
  try {
    if (!stripe) {
      initStripe();
    }

    if (!stripe) {
      return { success: false, error: "Stripe not initialized" };
    }

    let subscription;

    if (immediately) {
      subscription = await stripe.subscriptions.cancel(subscriptionId);
    } else {
      subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    logger.info(
      `Subscription ${subscriptionId} ${immediately ? "cancelled immediately" : "set to cancel at period end"}`
    );

    return {
      success: true,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };
  } catch (error) {
    logger.error(`Error cancelling subscription: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get customer by Discord ID from metadata
 * @param {string} discordId - Discord user ID
 * @returns {Object|null} - Customer data or null
 */
async function getCustomerByDiscordId(discordId) {
  try {
    if (!stripe) {
      initStripe();
    }

    if (!stripe) {
      return null;
    }

    // Search for customers with matching Discord ID in metadata
    const customers = await stripe.customers.search({
      query: `metadata['discord_id']:'${discordId}'`,
    });

    if (customers.data.length > 0) {
      const customer = customers.data[0];

      // Get active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 1,
      });

      return {
        customerId: customer.id,
        email: customer.email,
        subscription: subscriptions.data[0] || null,
      };
    }

    return null;
  } catch (error) {
    logger.error(`Error getting customer by Discord ID: ${error.message}`);
    return null;
  }
}

/**
 * Get all active subscriptions
 * @returns {Array} - Array of active subscriptions with Discord IDs
 */
async function getAllActiveSubscriptions() {
  try {
    if (!stripe) {
      initStripe();
    }

    if (!stripe) {
      return [];
    }

    const subscriptions = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      expand: ["data.customer"],
    });

    const activeSubscriptions = [];

    for (const subscription of subscriptions.data) {
      const discordId = subscription.metadata?.discord_id;

      if (discordId) {
        activeSubscriptions.push({
          subscriptionId: subscription.id,
          discordId,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          customerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer?.id,
        });
      }
    }

    return activeSubscriptions;
  } catch (error) {
    logger.error(`Error getting all active subscriptions: ${error.message}`);
    return [];
  }
}

module.exports = {
  initStripe,
  createCheckoutSession,
  getSubscriptionStatus,
  getCheckoutSession,
  listRecentCompletedCheckouts,
  cancelSubscription,
  getCustomerByDiscordId,
  getAllActiveSubscriptions,
};
