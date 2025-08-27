/**
 * Database Configuration
 * Centralizes all database-related configuration
 */

module.exports = {
  host: process.env.DB_HOST || "uk03-sql.pebblehost.com",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "customer_1110818_users",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "customer_1110818_users",
  connectionLimit: 10,
  timeout: 60000,
  charset: "utf8mb4",
  ssl: false,
};
