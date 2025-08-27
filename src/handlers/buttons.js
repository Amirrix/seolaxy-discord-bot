/**
 * Button Handlers
 * Handles Discord button interaction events
 */

const logger = require("../utils/logger");
const { createRegistrationModal } = require("../components/modals");
const csvExport = require("../services/csvExport");
const database = require("../services/database");
const { generateUsersEmbed, USERS_PER_PAGE } = require("../components/embeds");
const { createUserInterfaceButtons } = require("../components/buttons");
const channels = require("../constants/channels");

// Store pagination state
let currentUsersPage = 1;
let usersEmbedMessageId = null;

/**
 * Reset users embed state (called after cleanup)
 */
function resetUsersEmbedState() {
  usersEmbedMessageId = null;
  currentUsersPage = 1;
}

/**
 * Handle join button click
 * @param {Interaction} interaction - Discord interaction
 */
async function handleJoinButton(interaction) {
  logger.info(`Join button clicked by ${interaction.user.tag}`);

  const modal = createRegistrationModal();
  await interaction.showModal(modal);
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
 * Main button handler router
 * @param {Interaction} interaction - Discord interaction
 */
async function handleButton(interaction) {
  try {
    if (interaction.customId === "join_button") {
      await handleJoinButton(interaction);
    } else if (interaction.customId === "users_export_csv") {
      await handleUsersExportButton(interaction);
    } else if (interaction.customId.startsWith("users_")) {
      await handleUsersPaginationButton(interaction);
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
  handleJoinButton,
  handleUsersPaginationButton,
  handleUsersExportButton,
  resetUsersEmbedState,
};
