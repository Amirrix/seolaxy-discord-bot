/**
 * Legacy User Migration Script
 * 
 * This script marks all existing users (who paid the one-time fee) as legacy users
 * and gives them a 30-day grace period before requiring a subscription.
 * 
 * IMPORTANT: This script should only be run ONCE when transitioning to the subscription model.
 * It includes multiple safeguards to prevent accidental re-runs:
 * 1. Checks for existing migration marker in database
 * 2. Only migrates users who are NOT already marked as legacy
 * 3. Requires explicit confirmation before proceeding
 * 
 * Run this script ONCE:
 * node scripts/migrate-legacy-users.js
 */

require("dotenv").config();

const mysql = require("mysql2/promise");
const readline = require("readline");
const dbConfig = require("../src/config/database");

// Grace period in days
const GRACE_PERIOD_DAYS = 30;

// Migration marker table name
const MIGRATION_TABLE = "migration_history";

/**
 * Prompt user for confirmation
 * @param {string} question - Question to ask
 * @returns {Promise<boolean>} - User's response
 */
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
    });
  });
}

async function migrateUsers() {
  console.log("=".repeat(60));
  console.log("Legacy User Migration Script");
  console.log("=".repeat(60));
  console.log(`\nGrace Period: ${GRACE_PERIOD_DAYS} days\n`);

  let pool;

  try {
    // Create database connection
    console.log("Connecting to database...");
    pool = mysql.createPool(dbConfig);

    // Test connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log("✅ Database connection successful\n");

    // Create migration history table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(100) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        users_affected INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Check if this migration was already run
    const [existingMigration] = await pool.execute(
      `SELECT * FROM ${MIGRATION_TABLE} WHERE migration_name = 'legacy_users_grace_period'`
    );

    if (existingMigration.length > 0) {
      const migration = existingMigration[0];
      console.log("⚠️  WARNING: This migration has already been executed!");
      console.log(`   Executed on: ${new Date(migration.executed_at).toLocaleString()}`);
      console.log(`   Users affected: ${migration.users_affected}`);
      console.log("\n❌ Migration aborted to prevent giving users another free month.");
      console.log("   If you need to run this again, manually delete the migration record:");
      console.log(`   DELETE FROM ${MIGRATION_TABLE} WHERE migration_name = 'legacy_users_grace_period';`);
      return;
    }

    console.log("✅ No previous migration found - safe to proceed\n");

    // First, check if the new columns exist
    console.log("Checking if subscription columns exist...");
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
      [dbConfig.database]
    );

    const columnNames = columns.map((c) => c.COLUMN_NAME);
    const requiredColumns = [
      "stripe_customer_id",
      "stripe_subscription_id",
      "subscription_status",
      "subscription_ends_at",
      "is_legacy_user",
    ];

    const missingColumns = requiredColumns.filter(
      (col) => !columnNames.includes(col)
    );

    if (missingColumns.length > 0) {
      console.log("\n⚠️  Missing columns detected. Adding them now...\n");

      const columnDefinitions = {
        stripe_customer_id: "VARCHAR(50)",
        stripe_subscription_id: "VARCHAR(50)",
        subscription_status:
          "ENUM('active', 'past_due', 'canceled', 'unpaid', 'trialing', 'none') DEFAULT 'none'",
        subscription_ends_at: "TIMESTAMP NULL",
        is_legacy_user: "BOOLEAN DEFAULT FALSE",
      };

      for (const col of missingColumns) {
        try {
          await pool.execute(
            `ALTER TABLE users ADD COLUMN ${col} ${columnDefinitions[col]}`
          );
          console.log(`  ✅ Added column: ${col}`);
        } catch (error) {
          if (!error.message.includes("Duplicate column")) {
            console.error(`  ❌ Error adding column ${col}: ${error.message}`);
          }
        }
      }
      console.log("");
    } else {
      console.log("✅ All subscription columns exist\n");
    }

    // Count users to be migrated
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as count FROM users 
       WHERE (is_legacy_user = FALSE OR is_legacy_user IS NULL)
       AND (stripe_subscription_id IS NULL OR stripe_subscription_id = '')`
    );

    const usersToMigrate = countResult[0].count;

    if (usersToMigrate === 0) {
      console.log("ℹ️  No users to migrate. All users are either:");
      console.log("   - Already marked as legacy users");
      console.log("   - Already have a Stripe subscription");
      console.log("\nMigration complete (nothing to do).");
      return;
    }

    console.log(`Found ${usersToMigrate} users to migrate.\n`);

    // Show preview of users
    const [previewUsers] = await pool.execute(
      `SELECT discord_id, discord_username, first_name, last_name, email, created_at
       FROM users 
       WHERE (is_legacy_user = FALSE OR is_legacy_user IS NULL)
       AND (stripe_subscription_id IS NULL OR stripe_subscription_id = '')
       ORDER BY created_at DESC
       LIMIT 10`
    );

    console.log("Preview of users to be migrated (up to 10):");
    console.log("-".repeat(60));
    for (const user of previewUsers) {
      console.log(
        `  ${user.discord_username} (${user.first_name} ${user.last_name})`
      );
      console.log(`    Discord ID: ${user.discord_id}`);
      console.log(`    Joined: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log("");
    }

    if (usersToMigrate > 10) {
      console.log(`  ... and ${usersToMigrate - 10} more users\n`);
    }

    // Calculate grace period end date
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

    console.log("-".repeat(60));
    console.log(`\nGrace period will end on: ${gracePeriodEnd.toLocaleDateString()}`);
    console.log(`(${GRACE_PERIOD_DAYS} days from now)\n`);

    // Confirm migration
    console.log("⚠️  This will update all users listed above to:");
    console.log("   - is_legacy_user = TRUE");
    console.log("   - subscription_status = 'trialing'");
    console.log(`   - subscription_ends_at = ${gracePeriodEnd.toISOString()}\n`);

    // Ask for explicit confirmation
    console.log("⚠️  IMPORTANT: This migration should only be run ONCE!");
    console.log("   Running it again will NOT affect already-migrated users,");
    console.log("   but this safeguard prevents accidental re-runs.\n");

    const confirmed = await askConfirmation(
      'Type "yes" to confirm and proceed with migration: '
    );

    if (!confirmed) {
      console.log("\n❌ Migration cancelled by user.");
      return;
    }

    // Perform the migration
    console.log("\nMigrating users...");

    const [result] = await pool.execute(
      `UPDATE users SET 
        is_legacy_user = TRUE,
        subscription_status = 'trialing',
        subscription_ends_at = DATE_ADD(NOW(), INTERVAL ? DAY)
       WHERE (is_legacy_user = FALSE OR is_legacy_user IS NULL)
       AND (stripe_subscription_id IS NULL OR stripe_subscription_id = '')`,
      [GRACE_PERIOD_DAYS]
    );

    // Record the migration so it can't be run again
    await pool.execute(
      `INSERT INTO ${MIGRATION_TABLE} (migration_name, users_affected) VALUES (?, ?)`,
      ["legacy_users_grace_period", result.affectedRows]
    );

    console.log(`\n✅ Migration complete!`);
    console.log(`   ${result.affectedRows} users marked as legacy`);
    console.log(
      `   Grace period ends: ${gracePeriodEnd.toLocaleDateString()}\n`
    );
    console.log("✅ Migration recorded in database - cannot be run again accidentally.");

    // Verify migration
    const [verifyResult] = await pool.execute(
      `SELECT COUNT(*) as count FROM users WHERE is_legacy_user = TRUE`
    );

    console.log(`Total legacy users in database: ${verifyResult[0].count}`);

  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log("\nDatabase connection closed.");
    }
  }
}

// Run migration
migrateUsers()
  .then(() => {
    console.log("\n" + "=".repeat(60));
    console.log("Migration script finished successfully!");
    console.log("=".repeat(60));
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nUnexpected error:", error);
    process.exit(1);
  });
