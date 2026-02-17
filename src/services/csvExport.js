/**
 * CSV Export Service
 * Handles CSV generation and export functionality
 */

const { AttachmentBuilder } = require("discord.js");
const database = require("./database");
const logger = require("../utils/logger");

/**
 * Generate CSV data from users table
 * @returns {string|null} - CSV content or null if no users
 */
async function generateUsersCSV() {
  try {
    const users = await database.fetchAllUsers();

    if (users.length === 0) {
      return null;
    }

    // CSV headers
    const headers = [
      "ID",
      "Discord ID",
      "Discord Username",
      "First Name",
      "Last Name",
      "Email",
      "Project Name",
      "Invoice Number",
      "Created At",
      "Updated At",
    ];

    // CSV rows
    const rows = users.map((user) => [
      user.id,
      user.discord_id,
      user.discord_username,
      user.first_name,
      user.last_name,
      user.email,
      user.project_name || "Searching",
      user.invoice_number,
      new Date(user.created_at).toISOString(),
      new Date(user.updated_at).toISOString(),
    ]);

    // Escape CSV fields (handle commas, quotes, newlines)
    const escapeCSVField = (field) => {
      if (field === null || field === undefined) return "";
      const stringField = String(field);
      if (
        stringField.includes(",") ||
        stringField.includes('"') ||
        stringField.includes("\n")
      ) {
        return '"' + stringField.replace(/"/g, '""') + '"';
      }
      return stringField;
    };

    // Build CSV content
    let csvContent = headers.map(escapeCSVField).join(",") + "\n";

    for (const row of rows) {
      csvContent += row.map(escapeCSVField).join(",") + "\n";
    }

    return csvContent;
  } catch (error) {
    logger.error(`Error generating CSV: ${error.message}`);
    return null;
  }
}

/**
 * Create CSV attachment for Discord
 * @param {string} csvContent - CSV content
 * @returns {AttachmentBuilder} - Discord attachment
 */
function createCSVAttachment(csvContent) {
  // Create filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `users-export-${timestamp}.csv`;

  // Create attachment
  return new AttachmentBuilder(Buffer.from(csvContent, "utf-8"), {
    name: filename,
  });
}

/**
 * Export users as CSV
 * @returns {Object} - Export result with attachment and user count
 */
async function exportUsersAsCSV() {
  try {
    const csvContent = await generateUsersCSV();

    if (!csvContent) {
      return { success: false, error: "No users found to export" };
    }

    const attachment = createCSVAttachment(csvContent);
    const users = await database.fetchAllUsers();

    return {
      success: true,
      attachment,
      userCount: users.length,
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error(`Error exporting users as CSV: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Generate CSV data from Mentorship #2 users
 * @returns {string|null} - CSV content or null if no users
 */
async function generateMentorship2UsersCSV() {
  try {
    const users = await database.fetchMentorship2Users();

    if (users.length === 0) {
      return null;
    }

    const headers = [
      "ID",
      "Discord ID",
      "Discord Username",
      "First Name",
      "Last Name",
      "Email",
      "Project Name",
      "Invoice Number",
      "Created At",
      "Updated At",
    ];

    const rows = users.map((user) => [
      user.id,
      user.discord_id,
      user.discord_username,
      user.first_name,
      user.last_name,
      user.email,
      user.project_name || "searching",
      user.invoice_number,
      new Date(user.created_at).toISOString(),
      new Date(user.updated_at).toISOString(),
    ]);

    const escapeCSVField = (field) => {
      if (field === null || field === undefined) return "";
      const stringField = String(field);
      if (
        stringField.includes(",") ||
        stringField.includes('"') ||
        stringField.includes("\n")
      ) {
        return '"' + stringField.replace(/"/g, '""') + '"';
      }
      return stringField;
    };

    let csvContent = headers.map(escapeCSVField).join(",") + "\n";

    for (const row of rows) {
      csvContent += row.map(escapeCSVField).join(",") + "\n";
    }

    return csvContent;
  } catch (error) {
    logger.error(`Error generating Mentorship #2 CSV: ${error.message}`);
    return null;
  }
}

/**
 * Export Mentorship #2 users as CSV
 * @returns {Object} - Export result with attachment and user count
 */
async function exportMentorship2UsersAsCSV() {
  try {
    const csvContent = await generateMentorship2UsersCSV();

    if (!csvContent) {
      return {
        success: false,
        error: "Nema korisnika za eksport",
      };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `mentorship2-users-export-${timestamp}.csv`;
    const attachment = new AttachmentBuilder(
      Buffer.from(csvContent, "utf-8"),
      { name: filename }
    );
    const users = await database.fetchMentorship2Users();

    return {
      success: true,
      attachment,
      userCount: users.length,
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error(
      `Error exporting Mentorship #2 users as CSV: ${error.message}`
    );
    return { success: false, error: error.message };
  }
}

module.exports = {
  generateUsersCSV,
  createCSVAttachment,
  exportUsersAsCSV,
  generateMentorship2UsersCSV,
  exportMentorship2UsersAsCSV,
};
