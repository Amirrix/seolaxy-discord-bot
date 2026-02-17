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
 * Create Bosnian join message embed (without diacritics)
 * @returns {EmbedBuilder} - Bosnian join message embed
 */
function createBosnianJoinEmbed() {
  return new EmbedBuilder()
    .setTitle("🚀 Zdravo! Preostao je samo jos jedan korak:")
    .setDescription(
      "• Molim te otvori PDF racun koji je stigao putem emaila.\n" +
        '• Na njemu ces gore desno pronaci "Invoice. No." koji pocinje sa "pi_" ili "SM-".\n' +
        '• Kopiraj cijeli tekst, ukljucujuci "pi_" ili "SM-" i sve znakove koje slijede.\n' +
        '• Klikni ispod na dugme "JOIN", upisi sve podatke i kopiraj taj broj u polje za racun.'
    )
    .setColor(0x00ae86)
    .setFooter({
      text: "📌 Kliknite na dugme ispod da se pridruzite!",
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
 * Create Bosnian registration success embed (without diacritics)
 * @param {string} nickname - User nickname
 * @param {string} memberStatusText - Member status text
 * @returns {EmbedBuilder} - Bosnian success embed
 */
function createBosnianSuccessEmbed(nickname, memberStatusText) {
  const channels = require("../constants/channels");

  let description = "Cestitam, registracija je uspjesna.";

  description +=
    "\n\nMolim te klikni na next (dole desno, bijela strelica u ljubicastom krugu)";

  return new EmbedBuilder()
    .setTitle("✅ Registracija uspjesna!")
    .setDescription(description)
    .addFields(
      {
        name: "Nadimak",
        value: nickname || "Nadimak nije mogao biti postavljen",
        inline: true,
      },
      {
        name: "Status clana",
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
 * Create English subscription embed
 * @returns {EmbedBuilder} - English subscribe embed
 */
function createEnglishSubscribeEmbed() {
  return new EmbedBuilder()
    .setTitle("🚀 Subscribe to Seolaxy")
    .setDescription(
      "**Get full access to all member channels and resources!**\n\n" +
        "By subscribing, you'll unlock:\n" +
        "• Access to all premium channels\n" +
        "• Exclusive learning materials\n" +
        "• Community support and networking\n" +
        "• Regular updates and new content\n\n" +
        "**How it works:**\n" +
        "1. Click the **Subscribe** button below\n" +
        "2. Complete the secure checkout on Stripe\n" +
        "3. Your access will be activated automatically within minutes!\n\n" +
        "💳 *Secure payment powered by Stripe*"
    )
    .setColor(0x6772e5) // Stripe purple
    .setFooter({
      text: "📌 Click the button below to subscribe!",
    })
    .setTimestamp();
}

/**
 * Create Bosnian subscription embed (without diacritics)
 * @returns {EmbedBuilder} - Bosnian subscribe embed
 */
function createBosnianSubscribeEmbed() {
  return new EmbedBuilder()
    .setTitle("🚀 Pretplatite se na Seolaxy")
    .setDescription(
      "**Dobijte puni pristup svim clanskim kanalima i resursima!**\n\n" +
        "Pretplatom cete otkljucati:\n" +
        "• Pristup svim premium kanalima\n" +
        "• Ekskluzivne materijale za ucenje\n" +
        "• Podrsku zajednice i umrezavanje\n" +
        "• Redovna azuriranja i novi sadrzaj\n\n" +
        "**Kako funkcionise:**\n" +
        "1. Kliknite na dugme **Pretplati se** ispod\n" +
        "2. Zavrsite sigurnu naplatu na Stripe-u\n" +
        "3. Vas pristup ce biti automatski aktiviran u roku od nekoliko minuta!\n\n" +
        "💳 *Sigurno placanje putem Stripe-a*"
    )
    .setColor(0x6772e5) // Stripe purple
    .setFooter({
      text: "📌 Kliknite na dugme ispod da se pretplatite!",
    })
    .setTimestamp();
}

/**
 * Create subscribe embed (main server - Bosnian)
 * @returns {EmbedBuilder} - Subscribe embed
 */
function createSubscribeEmbed() {
  return createBosnianSubscribeEmbed();
}

/**
 * Create subscription checkout embed (Bosnian without diacritics)
 * @param {string} checkoutUrl - Stripe checkout URL
 * @returns {EmbedBuilder} - Subscription checkout embed
 */
function createSubscriptionCheckoutEmbed(checkoutUrl) {
  return new EmbedBuilder()
    .setTitle("💳 Zavrsite vasu pretplatu")
    .setDescription(
      "Kliknite na link ispod da zavrsiste placanje pretplate.\n\n" +
        `**[Kliknite ovdje za pretplatu](${checkoutUrl})**\n\n` +
        "Nakon uspjesnog placanja, vas pristup ce biti automatski aktiviran u roku od nekoliko minuta.\n\n" +
        "⏱️ *Ovaj link istice za 24 sata*"
    )
    .setColor(0x6772e5)
    .setTimestamp();
}

/**
 * Create subscription status embed for admin commands
 * @param {Object} subscriptionData - Subscription data
 * @returns {EmbedBuilder} - Subscription status embed
 */
function createSubscriptionStatusEmbed(subscriptionData) {
  const {
    discordUsername,
    status,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionEndsAt,
    isLegacy,
  } = subscriptionData;

  const statusEmoji = {
    active: "✅",
    trialing: "⏳",
    past_due: "⚠️",
    canceled: "❌",
    unpaid: "🚫",
    none: "❓",
  };

  return new EmbedBuilder()
    .setTitle("📊 Subscription Status")
    .addFields(
      {
        name: "User",
        value: discordUsername || "Unknown",
        inline: true,
      },
      {
        name: "Status",
        value: `${statusEmoji[status] || "❓"} ${status?.toUpperCase() || "NONE"}`,
        inline: true,
      },
      {
        name: "Type",
        value: isLegacy ? "Legacy (Grace Period)" : "Subscription",
        inline: true,
      },
      {
        name: "Stripe Customer",
        value: stripeCustomerId || "N/A",
        inline: true,
      },
      {
        name: "Subscription ID",
        value: stripeSubscriptionId || "N/A",
        inline: true,
      },
      {
        name: "Expires/Renews",
        value: subscriptionEndsAt
          ? new Date(subscriptionEndsAt).toLocaleDateString()
          : "N/A",
        inline: true,
      }
    )
    .setColor(
      status === "active" ? 0x00ff00 : status === "past_due" ? 0xff9900 : 0xff0000
    )
    .setTimestamp();
}

/**
 * Get subscription status emoji and text
 * @param {string} status - Subscription status
 * @param {boolean} isLegacy - Whether user is a legacy user
 * @returns {string} - Formatted status string
 */
function getSubscriptionStatusDisplay(status, isLegacy) {
  const statusEmoji = {
    active: "✅",
    trialing: "⏳",
    past_due: "⚠️",
    canceled: "❌",
    unpaid: "🚫",
    none: "❓",
  };

  const emoji = statusEmoji[status] || "❓";
  const statusText = status ? status.toUpperCase() : "NONE";
  const typeText = isLegacy ? " (Legacy)" : "";

  return `${emoji} ${statusText}${typeText}`;
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

  // Count subscription stats
  const activeCount = users.filter(
    (u) => u.subscription_status === "active"
  ).length;
  const trialingCount = users.filter(
    (u) => u.subscription_status === "trialing"
  ).length;
  const legacyCount = users.filter((u) => u.is_legacy_user).length;

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

  // Add stats summary at top
  description += `**📈 Stats:** ${activeCount} Active | ${trialingCount} Trial | ${legacyCount} Legacy\n`;
  description += "━".repeat(30) + "\n\n";

  for (let i = 0; i < displayUsers.length; i++) {
    const user = displayUsers[i];
    const globalIndex = startIndex + i + 1;

    // Get subscription status display
    const subscriptionDisplay = getSubscriptionStatusDisplay(
      user.subscription_status,
      user.is_legacy_user
    );

    // Format expiry/renewal date
    let expiryText = "N/A";
    if (user.subscription_ends_at) {
      const expiryDate = new Date(user.subscription_ends_at);
      const now = new Date();
      const daysRemaining = Math.ceil(
        (expiryDate - now) / (1000 * 60 * 60 * 24)
      );
      expiryText = `${expiryDate.toLocaleDateString()} (${daysRemaining}d)`;
    }

    // Build user info string
    let userInfo =
      `**${globalIndex}.** ${user.first_name || "—"} ${user.last_name || "—"}\n` +
      `🆔 ${user.discord_username}\n` +
      `📧 ${user.email || "N/A"}\n` +
      `💳 ${subscriptionDisplay}\n`;

    // Add Stripe info if available
    if (user.stripe_customer_id) {
      userInfo += `🔑 Stripe: \`${user.stripe_customer_id}\`\n`;
    }

    // Add expiry/renewal info
    if (user.subscription_status && user.subscription_status !== "none") {
      const label =
        user.subscription_status === "active" ? "Renews" : "Expires";
      userInfo += `📅 ${label}: ${expiryText}\n`;
    }

    // Add legacy invoice if exists (for legacy users)
    if (user.invoice_number && user.is_legacy_user) {
      userInfo += `📄 Invoice: ${user.invoice_number}\n`;
    }

    userInfo += "\n";
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
    text: `Total: ${totalUsers} | Active: ${activeCount} | Trial/Legacy: ${trialingCount} | Page ${page}/${totalPages || 1}`,
  });

  return { embed, totalPages };
}

// ===== Mentorship #2 Embeds (Croatian) =====

/**
 * Create Mentorship #2 join message embed (Croatian)
 * @returns {EmbedBuilder} - Croatian join message embed
 */
function createMentorship2JoinEmbed() {
  return new EmbedBuilder()
    .setTitle("🚀 Zdravo! Preostao je samo još jedan korak:")
    .setDescription(
      "• Molim te otvori PDF račun koji je stigao putem emaila.\n" +
        '• Na njemu ćeš gore desno pronaći "Invoice. No." koji počinje sa "SM-".\n' +
        '• Kopiraj cijeli tekst, uključujući "SM-" i sve znakove koje slijede.\n' +
        '• Klikni ispod na dugme "Pridruži se", upiši sve podatke i kopiraj taj broj u polje za fakturu.'
    )
    .setColor(0x00ae86)
    .setFooter({
      text: "📌 Klikni na dugme ispod da se pridružiš!",
    })
    .setTimestamp();
}

/**
 * Create Mentorship #2 registration success embed (Croatian)
 * @param {Object} data - Registration data
 * @returns {EmbedBuilder} - Success embed linking to Thinkific info channel
 */
function createMentorship2SuccessEmbed(data) {
  const { nickname, roleAssigned } = data;

  const memberStatusText = roleAssigned
    ? "✅ Verificiran"
    : "⚠️ Dodjela uloge nije uspjela";

  return new EmbedBuilder()
    .setTitle("✅ Registracija uspješna!")
    .setDescription(
      "Čestitam, registracija je uspješna.\n\n" +
        "Pogledaj kanal <#1463968532445532424> za pristup SEOLAXY Masterclass videosima i daljnje upute."
    )
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
    .setColor(roleAssigned ? 0x00ff00 : 0xff9900)
    .setTimestamp();
}

/**
 * Generate Mentorship #2 users embed with pagination
 * @param {number} page - Current page number
 * @returns {Object} - Embed and pagination info
 */
async function generateMentorship2UsersEmbed(page = 1) {
  const users = await database.fetchMentorship2Users();
  const totalUsers = users.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / USERS_PER_PAGE));

  page = Math.max(1, Math.min(page, totalPages));

  const embed = new EmbedBuilder()
    .setTitle("📊 Mentorship #2 - Registrirani korisnici")
    .setColor(0x00ae86)
    .setTimestamp();

  if (totalUsers === 0) {
    embed.setDescription("Još nema registriranih korisnika.");
    embed.setFooter({ text: "Ukupno korisnika: 0" });
    return { embed, totalPages: 0 };
  }

  const startIndex = (page - 1) * USERS_PER_PAGE;
  const endIndex = Math.min(startIndex + USERS_PER_PAGE, totalUsers);
  const displayUsers = users.slice(startIndex, endIndex);

  let description = "";
  description += `**📈 Ukupno:** ${totalUsers} korisnika\n`;
  description += "━".repeat(30) + "\n\n";

  for (let i = 0; i < displayUsers.length; i++) {
    const user = displayUsers[i];
    const globalIndex = startIndex + i + 1;

    let userInfo =
      `**${globalIndex}.** ${user.first_name || "—"} ${user.last_name || "—"}\n` +
      `🆔 ${user.discord_username}\n` +
      `📧 ${user.email || "N/A"}\n` +
      `🏷️ ${user.project_name || "searching"}\n` +
      `📄 ${user.invoice_number || "N/A"}\n`;

    userInfo += "\n";
    description += userInfo;
  }

  if (totalPages > 1) {
    description += `\n➖\n📄 **Stranica ${page} od ${totalPages}** | Korisnici ${
      startIndex + 1
    }-${endIndex} od ${totalUsers}`;
  } else {
    description += `\n➖\n📄 Svi korisnici: ${totalUsers}`;
  }

  embed.setDescription(description);
  embed.setFooter({
    text: `Ukupno: ${totalUsers} | Stranica ${page}/${totalPages}`,
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
  // Subscription embeds
  createSubscribeEmbed,
  createEnglishSubscribeEmbed,
  createBosnianSubscribeEmbed,
  createSubscriptionCheckoutEmbed,
  createSubscriptionStatusEmbed,
  // Mentorship #2 embeds
  createMentorship2JoinEmbed,
  createMentorship2SuccessEmbed,
  generateMentorship2UsersEmbed,
};
