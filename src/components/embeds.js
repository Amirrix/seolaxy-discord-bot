/**
 * Embed Components
 * Contains all Discord embed templates
 */

const { EmbedBuilder } = require("discord.js");
const database = require("../services/database");

const USERS_PER_PAGE = 10;

/**
 * Create join message embed
 * @returns {EmbedBuilder} - Join message embed
 */
function createJoinEmbed() {
  return new EmbedBuilder()
    .setTitle("🚀 Join Our Community!")
    .setDescription(
      "Welcome! To join our community, you'll need to fill out a registration form with the following information:"
    )
    .addFields(
      { name: "📝 Required Information", value: "\u200B", inline: false },
      { name: "First Name", value: "Your first name", inline: true },
      { name: "Last Name", value: "Your last name", inline: true },
      {
        name: "Project Name",
        value: "Optional - Leave blank if searching",
        inline: true,
      },
      {
        name: "Invoice Number",
        value: "Your invoice number for verification",
        inline: true,
      },
      {
        name: "Email Address",
        value: "Your email address",
        inline: true,
      }
    )
    .setColor(0x00ae86)
    .setFooter({ text: "Click the button below to get started!" })
    .setTimestamp();
}

/**
 * Create registration success embed
 * @param {Object} data - Registration data
 * @returns {EmbedBuilder} - Success embed
 */
function createRegistrationSuccessEmbed(data) {
  const { nickname, isValid, memberRoleName } = data;

  let memberStatusText = "❌ Invoice validation failed";
  if (isValid) {
    memberStatusText = memberRoleName
      ? `✅ Verified - ${memberRoleName}`
      : "✅ Verified";
  }

  return new EmbedBuilder()
    .setTitle("✅ Registration Successful!")
    .setDescription(
      "Welcome to our community! Your registration has been processed."
    )
    .addFields(
      {
        name: "Nickname",
        value: nickname || "Could not set nickname",
        inline: true,
      },
      {
        name: "Member Status",
        value: memberStatusText,
        inline: true,
      }
    )
    .setColor(isValid ? 0x00ff00 : 0xff9900)
    .setTimestamp();
}

/**
 * Generate users embed with pagination
 * @param {number} page - Current page number
 * @returns {Object} - Embed and pagination info
 */
async function generateUsersEmbed(page = 1) {
  const users = await database.fetchAllUsers();
  const totalUsers = users.length;
  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);

  // Ensure page is within valid range
  page = Math.max(1, Math.min(page, totalPages));

  const embed = new EmbedBuilder()
    .setTitle("📊 Registered Users Database")
    .setColor(0x00ae86)
    .setTimestamp();

  if (totalUsers === 0) {
    embed.setDescription("No users registered yet.");
    embed.setFooter({ text: "Total Users: 0" });
    return { embed, totalPages: 0 };
  }

  // Calculate pagination
  const startIndex = (page - 1) * USERS_PER_PAGE;
  const endIndex = Math.min(startIndex + USERS_PER_PAGE, totalUsers);
  const displayUsers = users.slice(startIndex, endIndex);

  let description = "";

  for (let i = 0; i < displayUsers.length; i++) {
    const user = displayUsers[i];
    const globalIndex = startIndex + i + 1;
    const userInfo =
      `**${globalIndex}.** ${user.first_name} ${user.last_name}\n` +
      `📧 ${user.email}\n` +
      `🏷️ ${user.project_name || "Searching"}\n` +
      `📄 Invoice: ${user.invoice_number}\n` +
      `🆔 Discord: ${user.discord_username}\n` +
      `📅 Joined: ${new Date(user.created_at).toLocaleDateString()}\n\n`;

    description += userInfo;
  }

  // Add pagination info
  if (totalPages > 1) {
    description += `\n➖\n📄 **Page ${page} of ${totalPages}** | Showing users ${
      startIndex + 1
    }-${endIndex} of ${totalUsers}`;
  } else {
    description += `\n➖\n📄 Showing all ${totalUsers} users`;
  }

  embed.setDescription(description);
  embed.setFooter({
    text: `Total Users: ${totalUsers} | Page ${page}/${totalPages}`,
  });

  return { embed, totalPages };
}

module.exports = {
  createJoinEmbed,
  createRegistrationSuccessEmbed,
  generateUsersEmbed,
  USERS_PER_PAGE,
};
