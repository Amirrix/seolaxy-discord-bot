/**
 * Embed Components
 * Contains all Discord embed templates
 */

const { EmbedBuilder } = require("discord.js");
const database = require("../services/database");

const USERS_PER_PAGE = 10;

/**
 * Create English join message embed
 * @returns {EmbedBuilder} - English join message embed
 */
function createEnglishJoinEmbed() {
  return new EmbedBuilder()
    .setTitle("🚀 Hello! There is only one step left:")
    .setDescription(
      "• Please open the PDF invoice that arrived via email.\n" +
        '• On it you\'ll find "Invoice. No." in the top right that starts with "pi_".\n' +
        '• Copy the entire text, including "pi_" and all characters that follow.\n' +
        '• Click the "JOIN" button below, enter all data and copy that number into the invoice field.'
    )
    .setColor(0x00ae86)
    .setFooter({
      text: "📌 Click the button below to join!",
    })
    .setTimestamp();
}

/**
 * Create Bosnian join message embed
 * @returns {EmbedBuilder} - Bosnian join message embed
 */
function createBosnianJoinEmbed() {
  return new EmbedBuilder()
    .setTitle("🚀 Zdravo! Preostao je samo još jedan korak:")
    .setDescription(
      "• Molim te otvori PDF račun koji je stigao putem emaila.\n" +
        '• Na njemu ćeš gore desno pronaći "Invoice. No." koji počinje sa "pi_".\n' +
        '• Kopiraj cijeli tekst, uključujući "pi_" i sve znakove koje slijede.\n' +
        '• Klikni ispod na dugme "JOIN", upiši sve podatke i kopiraj taj broj u polje za račun.'
    )
    .setColor(0x00ae86)
    .setFooter({
      text: "📌 Kliknite na dugme ispod da se pridružite!",
    })
    .setTimestamp();
}

/**
 * Create join message embed (main server - Bosnian)
 * @returns {EmbedBuilder} - Join message embed
 */
function createJoinEmbed() {
  return createBosnianJoinEmbed();
}

/**
 * Create registration success embed
 * @param {Object} data - Registration data
 * @returns {EmbedBuilder} - Success embed
 */
function createRegistrationSuccessEmbed(data) {
  const { nickname, isValid, memberRoleName, userLanguage, inviteInfo } = data;

  let memberStatusText = "❌ Invoice validation failed";
  if (isValid) {
    memberStatusText = memberRoleName
      ? `✅ Verified - ${memberRoleName}`
      : "✅ Verified";
  }

  // Determine language and create appropriate embed
  if (userLanguage === "bosnian" && isValid) {
    return createBosnianSuccessEmbed(nickname, memberStatusText);
  } else {
    return createEnglishSuccessEmbed(
      nickname,
      memberStatusText,
      isValid,
      userLanguage,
      inviteInfo
    );
  }
}

/**
 * Create English registration success embed
 * @param {string} nickname - User nickname
 * @param {string} memberStatusText - Member status text
 * @param {boolean} isValid - Whether registration is valid
 * @param {string} userLanguage - User's language preference
 * @returns {EmbedBuilder} - English success embed
 */
function createEnglishSuccessEmbed(
  nickname,
  memberStatusText,
  isValid,
  userLanguage,
  inviteInfo
) {
  const channels = require("../constants/channels");

  let description = "Congratulations, registration successful.";

  if (isValid && userLanguage === "english") {
    if (inviteInfo && inviteInfo.inviteSent) {
      description +=
        "\n\n🎉 **Welcome to the English community!**\n📨 **Check your DMs** - You've received a personal invite link to the SEOLAXY (EN) server!\n\n⚠️ The invite link is for one-time use only and expires in 24 hours.";
    } else if (inviteInfo && inviteInfo.inviteUrl && !inviteInfo.inviteSent) {
      description +=
        "\n\n🎉 **Welcome to the English community!**\n⚠️ We couldn't send you a DM, but your invite link was created. Please contact an administrator.";
    } else {
      description += "\n\n🎉 **Welcome to the English community!**\n";
    }
  }

  return new EmbedBuilder()
    .setTitle("✅ Registration Successful!")
    .setDescription(description)
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
 * Create Bosnian registration success embed
 * @param {string} nickname - User nickname
 * @param {string} memberStatusText - Member status text
 * @returns {EmbedBuilder} - Bosnian success embed
 */
function createBosnianSuccessEmbed(nickname, memberStatusText) {
  const channels = require("../constants/channels");

  let description = "Čestitam, registracija je uspješna.";

  description +=
    "\n\nMolim te klikni na next (dole desno, bijela strelica u ljubičastom krugu)";

  return new EmbedBuilder()
    .setTitle("✅ Registracija uspješna!")
    .setDescription(description)
    .addFields(
      {
        name: "Nadimak",
        value: nickname || "Nadimak nije mogao biti postavljen",
        inline: true,
      },
      {
        name: "Status člana",
        value: memberStatusText,
        inline: true,
      }
    )
    .setColor(0x00ff00)
    .setTimestamp();
}

/**
 * Create join embed for second server (English server)
 * Uses English-only content for English server
 * @returns {EmbedBuilder} - Second server join embed
 */
function createSecondServerJoinEmbed() {
  return createEnglishJoinEmbed();
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
  createEnglishJoinEmbed,
  createBosnianJoinEmbed,
  createRegistrationSuccessEmbed,
  createSecondServerJoinEmbed,
  generateUsersEmbed,
  USERS_PER_PAGE,
};
