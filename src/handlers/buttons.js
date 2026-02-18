/**
 * Button Handlers
 * Handles Discord button interaction events
 */

const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("../utils/logger");
const {
  createRegistrationModal,
  createMentorship2Modal,
  createMentorship2RemoveUserModal,
  createMentorship2EditUserModal,
} = require("../components/modals");
const csvExport = require("../services/csvExport");
const database = require("../services/database");
const stripeService = require("../services/stripeService");
const subscriptionService = require("../services/subscriptionService");
const {
  generateUsersEmbed,
  generateMentorship2UsersEmbed,
  USERS_PER_PAGE,
  createSubscriptionCheckoutEmbed,
} = require("../components/embeds");
const {
  createUserInterfaceButtons,
  createMentorship2UserInterfaceButtons,
} = require("../components/buttons");
const channels = require("../constants/channels");

// Store pagination state (main server)
let currentUsersPage = 1;
let usersEmbedMessageId = null;

// Store pagination state (Mentorship #2)
let m2CurrentUsersPage = 1;
let m2UsersEmbedMessageId = null;

/**
 * Reset users embed state (called after cleanup)
 */
function resetUsersEmbedState() {
  usersEmbedMessageId = null;
  currentUsersPage = 1;
}

/**
 * Reset Mentorship #2 users embed state (called after cleanup)
 */
function resetMentorship2UsersEmbedState() {
  m2UsersEmbedMessageId = null;
  m2CurrentUsersPage = 1;
}

/**
 * Handle join button click (legacy - redirects to subscribe)
 * @param {Interaction} interaction - Discord interaction
 */
async function handleJoinButton(interaction) {
  logger.info(`Join button clicked by ${interaction.user.tag}`);

  const modal = createRegistrationModal();
  await interaction.showModal(modal);
}

/**
 * Handle subscribe button click
 * @param {Interaction} interaction - Discord interaction
 */
async function handleSubscribeButton(interaction) {
  const discordId = interaction.user.id;
  const discordUsername = interaction.user.tag;

  logger.info(`Subscribe button clicked by ${discordUsername} (${discordId})`);

  try {
    await interaction.deferReply({ flags: 64 }); // Ephemeral reply

    // Check if user already has an active subscription
    const existingUser = await database.getUserByDiscordId(discordId);

    if (
      existingUser &&
      (existingUser.subscription_status === "active" ||
        existingUser.subscription_status === "trialing")
    ) {
      // Check if it's a legacy user still in grace period
      if (
        existingUser.is_legacy_user &&
        existingUser.subscription_status === "trialing"
      ) {
        // Allow legacy users to subscribe before grace period ends
        logger.info(
          `Legacy user ${discordUsername} subscribing before grace period ends`
        );
      } else {
        // Re-assign roles in case they left and rejoined (they lose roles when leaving)
        await subscriptionService.assignSubscriptionRoles(discordId);
        await interaction.editReply({
          content:
            "✅ Vec imate aktivnu pretplatu! Pristup vam je osiguran. Ako i dalje imate problema sa kanalima, molimo kontaktirajte osoblje.",
        });
        return;
      }
    }

    // Check if user already has a pending checkout
    if (subscriptionService.hasPendingCheckout(discordId)) {
      await interaction.editReply({
        content:
          "⏳ Vec imate aktivnu sesiju za placanje. Molimo zavrsiste placanje ili sacekajte nekoliko minuta prije ponovnog pokusaja.",
      });
      return;
    }

    // Get user email if available
    const userEmail = existingUser?.email || null;

    // Create Stripe checkout session
    const checkoutResult = await stripeService.createCheckoutSession(
      discordId,
      discordUsername,
      userEmail
    );

    if (!checkoutResult.success) {
      logger.error(
        `Failed to create checkout session for ${discordUsername}: ${checkoutResult.error}`
      );
      await interaction.editReply({
        content:
          "❌ Nije moguce kreirati sesiju za placanje. Molimo pokusajte ponovo kasnije ili kontaktirajte osoblje.",
      });
      return;
    }

    // Trigger fast polling for this user
    subscriptionService.triggerFastPolling(discordId, checkoutResult.sessionId);

    // Create checkout embed with link
    const checkoutEmbed = createSubscriptionCheckoutEmbed(checkoutResult.url);

    await interaction.editReply({
      embeds: [checkoutEmbed],
    });

    logger.info(
      `Checkout session created for ${discordUsername}: ${checkoutResult.sessionId}`
    );
  } catch (error) {
    logger.error(`Error handling subscribe button: ${error.message}`);

    try {
      await interaction.editReply({
        content:
          "❌ Doslo je do greske prilikom obrade vaseg zahtjeva. Molimo pokusajte ponovo kasnije.",
      });
    } catch (editError) {
      logger.error(`Error sending error message: ${editError.message}`);
    }
  }
}

/**
 * Handle second server subscribe button click
 * @param {Interaction} interaction - Discord interaction
 */
async function handleSecondServerSubscribeButton(interaction) {
  // Same logic as main server subscribe
  await handleSubscribeButton(interaction);
}

/**
 * Handle users pagination button clicks
 * @param {Interaction} interaction - Discord interaction
 */
async function handleUsersPaginationButton(interaction) {
  try {
    await interaction.deferUpdate(); // Acknowledge the interaction without sending a response

    const users = await database.fetchAllUsers();
    const totalPages = Math.ceil(users.length / USERS_PER_PAGE);
    let newPage = currentUsersPage;

    switch (interaction.customId) {
      case "users_first_page":
        newPage = 1;
        break;
      case "users_prev_page":
        newPage = Math.max(1, currentUsersPage - 1);
        break;
      case "users_next_page":
        newPage = Math.min(totalPages, currentUsersPage + 1);
        break;
      case "users_last_page":
        newPage = totalPages;
        break;
      default:
        logger.warn(`Unknown pagination button: ${interaction.customId}`);
        return;
    }

    // Update the embed with the new page
    await updateUsersEmbed(newPage);

    logger.info(
      `Users pagination: moved to page ${newPage} by ${interaction.user.tag}`
    );
  } catch (error) {
    logger.error(`Error handling users pagination: ${error.message}`);
    try {
      await interaction.followUp({
        content: "❌ Error updating the users list. Please try again.",
        flags: 64, // EPHEMERAL flag
      });
    } catch (followUpError) {
      logger.error(
        `Error sending pagination error message: ${followUpError.message}`
      );
    }
  }
}

/**
 * Handle users export button click
 * @param {Interaction} interaction - Discord interaction
 */
async function handleUsersExportButton(interaction) {
  try {
    await interaction.deferReply({ flags: 64 }); // Ephemeral response

    logger.info(`Users CSV export requested by ${interaction.user.tag}`);

    const exportResult = await csvExport.exportUsersAsCSV();

    if (!exportResult.success) {
      await interaction.editReply({
        content: `❌ ${exportResult.error}`,
      });
      return;
    }

    await interaction.editReply({
      content: `✅ **Users database exported successfully!**\n\n📊 **${
        exportResult.userCount
      } users** exported to CSV\n📅 Generated: ${exportResult.timestamp.toLocaleString()}`,
      files: [exportResult.attachment],
    });

    logger.info(
      `CSV export completed for ${interaction.user.tag} - ${exportResult.userCount} users exported`
    );
  } catch (error) {
    logger.error(`Error handling users export: ${error.message}`);
    try {
      await interaction.editReply({
        content:
          "❌ Error generating CSV export. Please try again or contact an administrator.",
      });
    } catch (editError) {
      logger.error(`Error sending export error message: ${editError.message}`);
    }
  }
}

/**
 * Send or update users embed in the users channel
 * @param {number} page - Page number to display
 */
async function updateUsersEmbed(page = currentUsersPage) {
  try {
    // Get client instance from the module cache
    const { client } = require("../index");
    if (!client || !client.channels) {
      logger.warn("Client not available for updating users embed");
      return;
    }
    const usersChannel = await client.channels.fetch(channels.USERS_CHANNEL_ID);
    if (!usersChannel) {
      logger.error(
        `Could not find users channel with ID: ${channels.USERS_CHANNEL_ID}`
      );
      return;
    }

    const { embed, totalPages } = await generateUsersEmbed(page);
    currentUsersPage = page;

    // Create navigation buttons
    const components = createUserInterfaceButtons(totalPages, page);

    if (usersEmbedMessageId) {
      // Try to edit existing message
      try {
        const existingMessage = await usersChannel.messages.fetch(
          usersEmbedMessageId
        );
        await existingMessage.edit({ embeds: [embed], components });
        logger.info(`Users embed updated successfully (page ${page})`);
        return;
      } catch (error) {
        logger.warn(`Could not edit existing users embed: ${error.message}`);
        usersEmbedMessageId = null; // Reset so we create a new one
      }
    }

    // Send new message
    const message = await usersChannel.send({ embeds: [embed], components });
    usersEmbedMessageId = message.id;
    logger.info(`New users embed sent successfully (page ${page})`);
  } catch (error) {
    logger.error(`Error updating users embed: ${error.message}`);
  }
}

/**
 * Handle second server join button click
 * @param {Interaction} interaction - Discord interaction
 */
async function handleSecondServerJoinButton(interaction) {
  const { EmbedBuilder } = require("discord.js");
  const database = require("../services/database");
  const ROLES = require("../constants/roles");
  const discordConfig = require("../config/discord");
  const { client } = require("../index");

  try {
    const discordId = interaction.user.id;
    const member = interaction.member;
    const guild = interaction.guild;

    logger.info(`Second server join button clicked by ${interaction.user.tag}`);

    // Look up user in database BEFORE deferring reply
    const userData = await database.getUserByDiscordId(discordId);

    if (!userData) {
      // User not found in database - show registration modal like main server
      logger.info(
        `User ${interaction.user.tag} not found in database, showing registration modal`
      );

      // Show the same registration modal as the main server
      const modal = createRegistrationModal();
      await interaction.showModal(modal);
      return;
    }

    // User exists - now we can defer the reply for the rest of the process
    await interaction.deferReply({ flags: 64 }); // Ephemeral reply

    logger.info(
      `Processing second server setup for verified user: ${userData.discord_username}`
    );

    // Set up nickname
    const newNickname = `${userData.first_name} ${userData.last_name} [${userData.project_name}]`;
    try {
      await member.setNickname(newNickname);
      logger.info(
        `Set nickname for ${userData.discord_username} to: ${newNickname}`
      );
    } catch (error) {
      logger.warn(
        `Could not set nickname for ${userData.discord_username}: ${error.message}`
      );

      // Check if this is a nickname length error
      if (error.message && error.message.includes("BASE_TYPE_MAX_LENGTH")) {
        logger.error(
          `Nickname too long for ${userData.discord_username}: ${newNickname}`
        );
      }
    }

    // Handle role assignment
    const unverifiedRole = guild.roles.cache.get(
      ROLES.SECOND_SERVER_UNVERIFIED
    );
    const verifiedRole = guild.roles.cache.get(ROLES.SECOND_SERVER_VERIFIED);

    let roleResult = { success: false, message: "" };

    try {
      // Remove unverified role if user has it
      if (
        unverifiedRole &&
        member.roles.cache.has(ROLES.SECOND_SERVER_UNVERIFIED)
      ) {
        await member.roles.remove(unverifiedRole);
        logger.info(
          `Removed unverified role from ${userData.discord_username}`
        );
      }

      // Add verified role
      if (verifiedRole) {
        await member.roles.add(verifiedRole);
        logger.info(`Added verified role to ${userData.discord_username}`);
        roleResult.success = true;
        roleResult.message = "✅ Verified Member";
      } else {
        logger.error("Verified role not found in second server");
        roleResult.message = "⚠️ Role assignment failed";
      }
    } catch (roleError) {
      logger.error(
        `Error managing roles for ${userData.discord_username}: ${roleError.message}`
      );
      roleResult.message = "⚠️ Role assignment failed";
    }

    // Send success message
    const embed = new EmbedBuilder()
      .setTitle("🎉 Welcome to SEOLAXY (EN)!")
      .setDescription(
        `Welcome **${userData.first_name} ${userData.last_name}**! Your English server setup is complete.`
      )
      .addFields(
        {
          name: "Nickname",
          value:
            newNickname.length <= 32
              ? newNickname
              : "Could not set nickname (too long)",
          inline: true,
        },
        {
          name: "Status",
          value: roleResult.message,
          inline: true,
        },
        {
          name: "Project",
          value: userData.project_name || "Not specified",
          inline: true,
        }
      )
      .setColor(roleResult.success ? 0x00ff00 : 0xff9900)
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
    });

    logger.info(
      `Second server setup completed for ${userData.discord_username}`
    );
  } catch (error) {
    logger.error(`Error in second server join: ${error.message}`);
    await interaction.editReply({
      content:
        "❌ There was an error setting up your account. Please contact an administrator.",
    });
  }
}

// ===== Mentorship #2 Handlers =====

/**
 * Handle Mentorship #2 join button click
 * @param {Interaction} interaction - Discord interaction
 */
async function handleMentorship2JoinButton(interaction) {
  logger.info(
    `Mentorship #2 join button clicked by ${interaction.user.tag}`
  );

  const modal = createMentorship2Modal();
  await interaction.showModal(modal);
}

/**
 * Check if member can manage M2 users (Administrator or Manage Guild)
 * @param {GuildMember} member - Discord guild member
 * @returns {boolean}
 */
function canManageM2Users(member) {
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  );
}

/**
 * Handle Mentorship #2 "Remove user" button click
 * @param {Interaction} interaction - Discord interaction
 */
async function handleMentorship2RemoveUserButton(interaction) {
  if (!canManageM2Users(interaction.member)) {
    await interaction.reply({
      content: "❌ Nemaš ovlasti za uklanjanje korisnika.",
      flags: 64,
    });
    return;
  }
  const modal = createMentorship2RemoveUserModal();
  await interaction.showModal(modal);
}

/**
 * Handle Mentorship #2 "Edit user" button click
 * @param {Interaction} interaction - Discord interaction
 */
async function handleMentorship2EditUserButton(interaction) {
  if (!canManageM2Users(interaction.member)) {
    await interaction.reply({
      content: "❌ Nemaš ovlasti za uređivanje korisnika.",
      flags: 64,
    });
    return;
  }
  const modal = createMentorship2EditUserModal();
  await interaction.showModal(modal);
}

/**
 * Handle Mentorship #2 users pagination button clicks
 * @param {Interaction} interaction - Discord interaction
 */
async function handleMentorship2UsersPaginationButton(interaction) {
  try {
    await interaction.deferUpdate();

    const users = await database.fetchMentorship2Users();
    const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
    let newPage = m2CurrentUsersPage;

    switch (interaction.customId) {
      case "m2_users_first_page":
        newPage = 1;
        break;
      case "m2_users_prev_page":
        newPage = Math.max(1, m2CurrentUsersPage - 1);
        break;
      case "m2_users_next_page":
        newPage = Math.min(totalPages, m2CurrentUsersPage + 1);
        break;
      case "m2_users_last_page":
        newPage = totalPages;
        break;
      default:
        logger.warn(
          `Unknown M2 pagination button: ${interaction.customId}`
        );
        return;
    }

    await updateMentorship2UsersEmbed(newPage);

    logger.info(
      `M2 users pagination: moved to page ${newPage} by ${interaction.user.tag}`
    );
  } catch (error) {
    logger.error(`Error handling M2 users pagination: ${error.message}`);
    try {
      await interaction.followUp({
        content:
          "❌ Greška pri ažuriranju liste korisnika. Pokušajte ponovo.",
        flags: 64,
      });
    } catch (followUpError) {
      logger.error(
        `Error sending M2 pagination error message: ${followUpError.message}`
      );
    }
  }
}

/**
 * Handle Mentorship #2 users export button click
 * @param {Interaction} interaction - Discord interaction
 */
async function handleMentorship2UsersExportButton(interaction) {
  try {
    await interaction.deferReply({ flags: 64 });

    logger.info(
      `M2 Users CSV export requested by ${interaction.user.tag}`
    );

    const csvExportM2 = require("../services/csvExport");
    const exportResult = await csvExportM2.exportMentorship2UsersAsCSV();

    if (!exportResult.success) {
      await interaction.editReply({
        content: `❌ ${exportResult.error}`,
      });
      return;
    }

    await interaction.editReply({
      content: `✅ **Mentorship #2 korisnici eksportirani!**\n\n📊 **${
        exportResult.userCount
      } korisnika** eksportirano u CSV\n📅 Generirano: ${exportResult.timestamp.toLocaleString()}`,
      files: [exportResult.attachment],
    });

    logger.info(
      `M2 CSV export completed for ${interaction.user.tag} - ${exportResult.userCount} users exported`
    );
  } catch (error) {
    logger.error(`Error handling M2 users export: ${error.message}`);
    try {
      await interaction.editReply({
        content:
          "❌ Greška pri generiranju CSV eksporta. Pokušajte ponovo.",
      });
    } catch (editError) {
      logger.error(
        `Error sending M2 export error message: ${editError.message}`
      );
    }
  }
}

/**
 * Send or update Mentorship #2 users embed
 * @param {number} page - Page number to display
 */
async function updateMentorship2UsersEmbed(page = m2CurrentUsersPage) {
  try {
    const { client } = require("../index");
    if (!client || !client.channels) {
      logger.warn("Client not available for updating M2 users embed");
      return;
    }

    const usersChannel = await client.channels.fetch(
      channels.MENTORSHIP2_USERS_CHANNEL_ID
    );
    if (!usersChannel) {
      logger.error(
        `Could not find M2 users channel with ID: ${channels.MENTORSHIP2_USERS_CHANNEL_ID}`
      );
      return;
    }

    const { embed, totalPages } = await generateMentorship2UsersEmbed(page);
    m2CurrentUsersPage = page;

    const components = createMentorship2UserInterfaceButtons(totalPages, page);

    if (m2UsersEmbedMessageId) {
      try {
        const existingMessage = await usersChannel.messages.fetch(
          m2UsersEmbedMessageId
        );
        await existingMessage.edit({ embeds: [embed], components });
        logger.info(`M2 users embed updated successfully (page ${page})`);
        return;
      } catch (error) {
        logger.warn(
          `Could not edit existing M2 users embed: ${error.message}`
        );
        m2UsersEmbedMessageId = null;
      }
    }

    const message = await usersChannel.send({
      embeds: [embed],
      components,
    });
    m2UsersEmbedMessageId = message.id;
    logger.info(`New M2 users embed sent successfully (page ${page})`);
  } catch (error) {
    logger.error(`Error updating M2 users embed: ${error.message}`);
  }
}

/**
 * Main button handler router
 * @param {Interaction} interaction - Discord interaction
 */
async function handleButton(interaction) {
  try {
    if (interaction.customId === "join_button") {
      await handleJoinButton(interaction);
    } else if (interaction.customId === "subscribe_button") {
      await handleSubscribeButton(interaction);
    } else if (interaction.customId === "second_server_join") {
      await handleSecondServerJoinButton(interaction);
    } else if (interaction.customId === "second_server_subscribe") {
      await handleSecondServerSubscribeButton(interaction);
    } else if (interaction.customId === "users_export_csv") {
      await handleUsersExportButton(interaction);
    } else if (interaction.customId.startsWith("users_")) {
      await handleUsersPaginationButton(interaction);
    } else if (interaction.customId === "mentorship2_join") {
      await handleMentorship2JoinButton(interaction);
    } else if (interaction.customId === "m2_remove_user") {
      await handleMentorship2RemoveUserButton(interaction);
    } else if (interaction.customId === "m2_edit_user") {
      await handleMentorship2EditUserButton(interaction);
    } else if (interaction.customId === "m2_users_export_csv") {
      await handleMentorship2UsersExportButton(interaction);
    } else if (interaction.customId.startsWith("m2_users_")) {
      await handleMentorship2UsersPaginationButton(interaction);
    } else {
      logger.warn(`Unknown button interaction: ${interaction.customId}`);
    }
  } catch (error) {
    logger.error(`Error handling button interaction: ${error.message}`);
  }
}

module.exports = {
  handleButton,
  updateUsersEmbed,
  updateMentorship2UsersEmbed,
  handleJoinButton,
  handleSubscribeButton,
  handleSecondServerSubscribeButton,
  handleUsersPaginationButton,
  handleUsersExportButton,
  resetUsersEmbedState,
  resetMentorship2UsersEmbedState,
};
