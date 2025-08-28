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
    .setTitle("🚀 Join Us! | Pridružite Nam Se!")
    .setDescription(
      "Welcome! To get started, you'll need to join by opening an account.\n" +
        "When attempting to join, you'll need your Invoice Number – you can find it at the top of your invoice.\n\n" +
        "Dobrodošli! Da biste započeli, potrebno je da se pridružite otvaranjem računa.\n" +
        "Prilikom pokušaja pridruživanja, potrebno je da unesete svoj Broj Fakture (Invoice Number) – možete ga pronaći na vrhu svoje fakture."
    )
    .setColor(0x00ae86)
    .setFooter({
      text: "📌 Click the button below to join! | Kliknite na dugme ispod da se pridružite!",
    })
    .setTimestamp();
}

/**
 * Create registration success embed
 * @param {Object} data - Registration data
 * @returns {EmbedBuilder} - Success embed
 */
function createRegistrationSuccessEmbed(data) {
  const { nickname, isValid, memberRoleName, userLanguage } = data;

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
      userLanguage
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
  userLanguage
) {
  const channels = require("../constants/channels");

  let description = "Congratulations, registration successful.";

  if (isValid && userLanguage === "english") {
    description +=
      "\n\nPlease click on next (bottom right, white arrow in purple circle)";
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
