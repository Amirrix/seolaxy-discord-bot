/**
 * Database Service
 * Handles all database operations and connection management
 */

const mysql = require("mysql2/promise");
const dbConfig = require("../config/database");
const logger = require("../utils/logger");

let dbPool;

/**
 * Initialize database connection pool
 */
async function initDatabase() {
  try {
    dbPool = mysql.createPool(dbConfig);
    logger.info("Database connection pool created successfully");

    // Test the connection
    const connection = await dbPool.getConnection();
    await connection.ping();
    connection.release();
    logger.info("Database connection test successful");

    // Create users table if it doesn't exist
    await createUsersTable();
  } catch (error) {
    logger.error(`Database connection failed: ${error.message}`);
    // Don't exit the process, just log the error
    // The bot can still function without database features
  }
}

/**
 * Create users table if it doesn't exist
 */
async function createUsersTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_id VARCHAR(20) UNIQUE NOT NULL,
        discord_username VARCHAR(100) NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL,
        project_name VARCHAR(100),
        invoice_number VARCHAR(50),
        stripe_customer_id VARCHAR(50),
        stripe_subscription_id VARCHAR(50),
        subscription_status ENUM('active', 'past_due', 'canceled', 'unpaid', 'trialing', 'none') DEFAULT 'none',
        subscription_ends_at TIMESTAMP NULL,
        is_legacy_user BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await dbPool.execute(createTableQuery);
    logger.info("Users table created or verified successfully");

    // Add subscription columns if they don't exist (for existing tables)
    await addSubscriptionColumns();

    // Fix existing table character set if it exists
    try {
      const alterTableQuery = `
        ALTER TABLE users 
        CONVERT TO CHARACTER SET utf8mb4 
        COLLATE utf8mb4_unicode_ci
      `;
      await dbPool.execute(alterTableQuery);
      logger.info("Users table character set updated to utf8mb4");
    } catch (alterError) {
      // This might fail if table doesn't exist yet, which is fine
      logger.debug(`Table alter query info: ${alterError.message}`);
    }
  } catch (error) {
    logger.error(`Error creating users table: ${error.message}`);
  }
}

/**
 * Add subscription columns to existing users table
 */
async function addSubscriptionColumns() {
  const columnsToAdd = [
    {
      name: "stripe_customer_id",
      definition: "VARCHAR(50)",
    },
    {
      name: "stripe_subscription_id",
      definition: "VARCHAR(50)",
    },
    {
      name: "subscription_status",
      definition:
        "ENUM('active', 'past_due', 'canceled', 'unpaid', 'trialing', 'none') DEFAULT 'none'",
    },
    {
      name: "subscription_ends_at",
      definition: "TIMESTAMP NULL",
    },
    {
      name: "is_legacy_user",
      definition: "BOOLEAN DEFAULT FALSE",
    },
  ];

  for (const column of columnsToAdd) {
    try {
      await dbPool.execute(
        `ALTER TABLE users ADD COLUMN ${column.name} ${column.definition}`
      );
      logger.info(`Added column ${column.name} to users table`);
    } catch (error) {
      // Column might already exist, which is fine
      if (!error.message.includes("Duplicate column")) {
        logger.debug(`Column ${column.name} info: ${error.message}`);
      }
    }
  }

  // Make invoice_number nullable for subscription users
  try {
    await dbPool.execute(
      "ALTER TABLE users MODIFY COLUMN invoice_number VARCHAR(50)"
    );
    logger.debug("Made invoice_number column nullable");
  } catch (error) {
    logger.debug(`invoice_number modify info: ${error.message}`);
  }
}

/**
 * Save user to database
 * @param {Object} userData - User data object
 * @returns {boolean} - Success status
 */
async function saveUser(userData) {
  try {
    if (!dbPool) {
      logger.warn("Database not available, skipping user save");
      return false;
    }

    const insertQuery = `
      INSERT INTO users (discord_id, discord_username, first_name, last_name, email, project_name, invoice_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        discord_username = VALUES(discord_username),
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        email = VALUES(email),
        project_name = VALUES(project_name),
        invoice_number = VALUES(invoice_number),
        updated_at = CURRENT_TIMESTAMP
    `;

    const [result] = await dbPool.execute(insertQuery, [
      userData.discordId,
      userData.discordUsername,
      userData.firstName,
      userData.lastName,
      userData.email,
      userData.projectName,
      userData.invoiceNumber,
    ]);

    logger.info(
      `User ${userData.discordUsername} saved to database successfully`
    );
    return true;
  } catch (error) {
    logger.error(`Error saving user to database: ${error.message}`);
    return false;
  }
}

/**
 * Fetch all users from database
 * @returns {Array} - Array of user objects
 */
async function fetchAllUsers() {
  try {
    if (!dbPool) {
      logger.warn("Database not available, cannot fetch users");
      return [];
    }

    const [rows] = await dbPool.execute(
      "SELECT * FROM users ORDER BY created_at DESC"
    );
    return rows;
  } catch (error) {
    logger.error(`Error fetching users from database: ${error.message}`);
    return [];
  }
}

/**
 * Check if payment intent already exists in database
 * @param {string} invoiceNumber - Payment intent ID to check
 * @returns {boolean} - True if payment intent exists, false otherwise
 */
async function checkPaymentIntentExists(invoiceNumber) {
  try {
    if (!dbPool) {
      logger.warn("Database not available, cannot check payment intent");
      return false;
    }

    const [rows] = await dbPool.execute(
      "SELECT id FROM users WHERE invoice_number = ? LIMIT 1",
      [invoiceNumber]
    );

    const exists = rows.length > 0;
    logger.info(`Payment intent ${invoiceNumber} existence check: ${exists}`);

    return exists;
  } catch (error) {
    logger.error(`Error checking payment intent existence: ${error.message}`);
    // In case of error, we'll allow the registration to proceed
    // This prevents database issues from blocking legitimate users
    return false;
  }
}

/**
 * Get user by Discord ID
 * @param {string} discordId - Discord user ID
 * @returns {Object|null} - User object or null if not found
 */
async function getUserByDiscordId(discordId) {
  try {
    if (!dbPool) {
      logger.warn("Database not available, cannot lookup user");
      return null;
    }

    const [rows] = await dbPool.execute(
      "SELECT * FROM users WHERE discord_id = ? LIMIT 1",
      [discordId]
    );

    if (rows.length > 0) {
      const user = rows[0];
      logger.info(`Found user in database: ${user.discord_username}`);
      return user;
    } else {
      logger.info(`No user found in database for Discord ID: ${discordId}`);
      return null;
    }
  } catch (error) {
    logger.error(`Error looking up user by Discord ID: ${error.message}`);
    return null;
  }
}

/**
 * Get database pool instance
 * @returns {mysql.Pool|null} - Database pool or null
 */
function getPool() {
  return dbPool;
}

/**
 * Save subscription user to database (for new Stripe subscribers)
 * @param {Object} userData - User data object with subscription info
 * @returns {boolean} - Success status
 */
async function saveSubscriptionUser(userData) {
  try {
    if (!dbPool) {
      logger.warn("Database not available, skipping subscription user save");
      return false;
    }

    const insertQuery = `
      INSERT INTO users (
        discord_id, discord_username, first_name, last_name, email, project_name,
        stripe_customer_id, stripe_subscription_id, subscription_status, subscription_ends_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        discord_username = VALUES(discord_username),
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        email = VALUES(email),
        project_name = VALUES(project_name),
        stripe_customer_id = VALUES(stripe_customer_id),
        stripe_subscription_id = VALUES(stripe_subscription_id),
        subscription_status = VALUES(subscription_status),
        subscription_ends_at = VALUES(subscription_ends_at),
        updated_at = CURRENT_TIMESTAMP
    `;

    await dbPool.execute(insertQuery, [
      userData.discordId,
      userData.discordUsername,
      userData.firstName || "",
      userData.lastName || "",
      userData.email || "",
      userData.projectName || null,
      userData.stripeCustomerId,
      userData.stripeSubscriptionId,
      userData.subscriptionStatus || "active",
      userData.subscriptionEndsAt || null,
    ]);

    logger.info(
      `Subscription user ${userData.discordUsername} saved to database successfully`
    );
    return true;
  } catch (error) {
    logger.error(`Error saving subscription user to database: ${error.message}`);
    return false;
  }
}

/**
 * Update user subscription status
 * @param {string} discordId - Discord user ID
 * @param {Object} subscriptionData - Subscription data to update
 * @returns {boolean} - Success status
 */
async function updateUserSubscription(discordId, subscriptionData) {
  try {
    if (!dbPool) {
      logger.warn("Database not available, skipping subscription update");
      return false;
    }

    const updateQuery = `
      UPDATE users SET
        stripe_customer_id = COALESCE(?, stripe_customer_id),
        stripe_subscription_id = COALESCE(?, stripe_subscription_id),
        subscription_status = ?,
        subscription_ends_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE discord_id = ?
    `;

    const [result] = await dbPool.execute(updateQuery, [
      subscriptionData.stripeCustomerId || null,
      subscriptionData.stripeSubscriptionId || null,
      subscriptionData.subscriptionStatus,
      subscriptionData.subscriptionEndsAt || null,
      discordId,
    ]);

    if (result.affectedRows > 0) {
      logger.info(
        `Updated subscription status for Discord ID ${discordId} to ${subscriptionData.subscriptionStatus}`
      );
      return true;
    } else {
      logger.warn(`No user found with Discord ID ${discordId} to update`);
      return false;
    }
  } catch (error) {
    logger.error(`Error updating user subscription: ${error.message}`);
    return false;
  }
}

/**
 * Get all users with active subscriptions
 * @returns {Array} - Array of user objects with active subscriptions
 */
async function getUsersWithActiveSubscriptions() {
  try {
    if (!dbPool) {
      logger.warn("Database not available, cannot fetch active subscribers");
      return [];
    }

    const [rows] = await dbPool.execute(
      `SELECT * FROM users 
       WHERE subscription_status IN ('active', 'trialing', 'past_due') 
       AND stripe_subscription_id IS NOT NULL
       ORDER BY updated_at DESC`
    );
    return rows;
  } catch (error) {
    logger.error(`Error fetching active subscribers: ${error.message}`);
    return [];
  }
}

/**
 * Get all legacy users (need to migrate to subscription)
 * @returns {Array} - Array of legacy user objects
 */
async function getLegacyUsers() {
  try {
    if (!dbPool) {
      logger.warn("Database not available, cannot fetch legacy users");
      return [];
    }

    const [rows] = await dbPool.execute(
      `SELECT * FROM users 
       WHERE is_legacy_user = TRUE 
       AND (subscription_status = 'trialing' OR subscription_status = 'none')
       ORDER BY subscription_ends_at ASC`
    );
    return rows;
  } catch (error) {
    logger.error(`Error fetching legacy users: ${error.message}`);
    return [];
  }
}

/**
 * Get users with expiring subscriptions (within grace period)
 * @param {number} daysUntilExpiry - Number of days until expiry
 * @returns {Array} - Array of user objects
 */
async function getUsersWithExpiringSubscriptions(daysUntilExpiry = 3) {
  try {
    if (!dbPool) {
      logger.warn("Database not available, cannot fetch expiring subscriptions");
      return [];
    }

    const [rows] = await dbPool.execute(
      `SELECT * FROM users 
       WHERE subscription_status = 'past_due'
       AND subscription_ends_at IS NOT NULL
       AND subscription_ends_at <= DATE_ADD(NOW(), INTERVAL ? DAY)
       ORDER BY subscription_ends_at ASC`,
      [daysUntilExpiry]
    );
    return rows;
  } catch (error) {
    logger.error(`Error fetching expiring subscriptions: ${error.message}`);
    return [];
  }
}

/**
 * Get user by Stripe customer ID
 * @param {string} stripeCustomerId - Stripe customer ID
 * @returns {Object|null} - User object or null
 */
async function getUserByStripeCustomerId(stripeCustomerId) {
  try {
    if (!dbPool) {
      logger.warn("Database not available, cannot lookup user by Stripe ID");
      return null;
    }

    const [rows] = await dbPool.execute(
      "SELECT * FROM users WHERE stripe_customer_id = ? LIMIT 1",
      [stripeCustomerId]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    logger.error(`Error looking up user by Stripe customer ID: ${error.message}`);
    return null;
  }
}

/**
 * Mark all existing users as legacy users with grace period
 * @param {number} gracePeriodDays - Number of days for grace period
 * @returns {number} - Number of users updated
 */
async function markExistingUsersAsLegacy(gracePeriodDays = 30) {
  try {
    if (!dbPool) {
      logger.warn("Database not available, cannot mark legacy users");
      return 0;
    }

    const [result] = await dbPool.execute(
      `UPDATE users SET 
        is_legacy_user = TRUE,
        subscription_status = 'trialing',
        subscription_ends_at = DATE_ADD(NOW(), INTERVAL ? DAY)
       WHERE stripe_subscription_id IS NULL 
       AND is_legacy_user = FALSE`,
      [gracePeriodDays]
    );

    logger.info(`Marked ${result.affectedRows} users as legacy with ${gracePeriodDays} day grace period`);
    return result.affectedRows;
  } catch (error) {
    logger.error(`Error marking legacy users: ${error.message}`);
    return 0;
  }
}

/**
 * Fetch Mentorship #2 users (identified by invoice_number pattern SM-%/2026)
 * @returns {Array} - Array of Mentorship #2 user objects
 */
async function fetchMentorship2Users() {
  try {
    if (!dbPool) {
      logger.warn("Database not available, cannot fetch Mentorship #2 users");
      return [];
    }

    const [rows] = await dbPool.execute(
      "SELECT * FROM users WHERE invoice_number LIKE 'SM-%/2026' ORDER BY created_at DESC"
    );
    return rows;
  } catch (error) {
    logger.error(
      `Error fetching Mentorship #2 users from database: ${error.message}`
    );
    return [];
  }
}

/**
 * Get user by invoice number
 * @param {string} invoiceNumber - Invoice number (e.g. SM-0005/2026)
 * @returns {Object|null} - User object or null if not found
 */
async function getUserByInvoiceNumber(invoiceNumber) {
  try {
    if (!dbPool) {
      logger.warn("Database not available, cannot lookup user by invoice");
      return null;
    }

    const [rows] = await dbPool.execute(
      "SELECT * FROM users WHERE invoice_number = ? LIMIT 1",
      [invoiceNumber]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    logger.error(
      `Error looking up user by invoice number: ${error.message}`
    );
    return null;
  }
}

/**
 * Find user by Discord ID or invoice number
 * @param {string} identifier - Discord ID (snowflake) or invoice number
 * @returns {Object|null} - User object or null if not found
 */
async function findUserByIdentifier(identifier) {
  const trimmed = String(identifier).trim();
  if (!trimmed) return null;
  if (/^\d{17,19}$/.test(trimmed)) {
    return getUserByDiscordId(trimmed);
  }
  return getUserByInvoiceNumber(trimmed);
}

/**
 * Delete user by Discord ID
 * @param {string} discordId - Discord user ID
 * @returns {boolean} - Success status
 */
async function deleteUser(discordId) {
  try {
    if (!dbPool) {
      logger.warn("Database not available, cannot delete user");
      return false;
    }

    const [result] = await dbPool.execute(
      "DELETE FROM users WHERE discord_id = ?",
      [discordId]
    );

    if (result.affectedRows > 0) {
      logger.info(`Deleted user with Discord ID ${discordId}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error deleting user: ${error.message}`);
    return false;
  }
}

/**
 * Update user profile (first name, last name, email, project name)
 * @param {string} discordId - Discord user ID
 * @param {Object} updates - Fields to update (first_name, last_name, email, project_name)
 * @returns {boolean} - Success status
 */
async function updateUser(discordId, updates) {
  try {
    if (!dbPool) {
      logger.warn("Database not available, cannot update user");
      return false;
    }

    const allowed = ["first_name", "last_name", "email", "project_name"];
    const setClauses = [];
    const values = [];

    for (const key of allowed) {
      if (updates[key] !== undefined && updates[key] !== null) {
        setClauses.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }

    if (setClauses.length === 0) return true;

    values.push(discordId);
    const query = `UPDATE users SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE discord_id = ?`;
    const [result] = await dbPool.execute(query, values);

    if (result.affectedRows > 0) {
      logger.info(`Updated user ${discordId}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error updating user: ${error.message}`);
    return false;
  }
}

module.exports = {
  initDatabase,
  saveUser,
  fetchAllUsers,
  fetchMentorship2Users,
  checkPaymentIntentExists,
  getUserByDiscordId,
  getUserByInvoiceNumber,
  findUserByIdentifier,
  deleteUser,
  updateUser,
  getPool,
  // Subscription-related exports
  saveSubscriptionUser,
  updateUserSubscription,
  getUsersWithActiveSubscriptions,
  getLegacyUsers,
  getUsersWithExpiringSubscriptions,
  getUserByStripeCustomerId,
  markExistingUsersAsLegacy,
};
