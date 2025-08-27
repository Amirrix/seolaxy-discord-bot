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
        invoice_number VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await dbPool.execute(createTableQuery);
    logger.info("Users table created or verified successfully");

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
 * Get database pool instance
 * @returns {mysql.Pool|null} - Database pool or null
 */
function getPool() {
  return dbPool;
}

module.exports = {
  initDatabase,
  saveUser,
  fetchAllUsers,
  getPool,
};
