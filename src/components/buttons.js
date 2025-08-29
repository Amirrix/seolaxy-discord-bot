/**
 * Button Components
 * Contains all Discord button templates
 */

const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

/**
 * Create join button
 * @returns {ActionRowBuilder} - Join button row
 */
function createJoinButton() {
  const joinButton = new ButtonBuilder()
    .setCustomId("join_button")
    .setLabel("Join")
    .setEmoji("🔑")
    .setStyle(ButtonStyle.Primary);

  return new ActionRowBuilder().addComponents(joinButton);
}

/**
 * Create pagination buttons
 * @param {number} page - Current page
 * @param {number} totalPages - Total pages
 * @returns {ActionRowBuilder} - Pagination button row
 */
function createPaginationButtons(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("users_first_page")
      .setLabel("⏮️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 1),
    new ButtonBuilder()
      .setCustomId("users_prev_page")
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 1),
    new ButtonBuilder()
      .setCustomId("users_next_page")
      .setLabel("➡️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === totalPages),
    new ButtonBuilder()
      .setCustomId("users_last_page")
      .setLabel("⏭️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === totalPages)
  );
}

/**
 * Create export button
 * @returns {ActionRowBuilder} - Export button row
 */
function createExportButton() {
  const exportButton = new ButtonBuilder()
    .setCustomId("users_export_csv")
    .setLabel("📊 Export CSV")
    .setStyle(ButtonStyle.Success);

  return new ActionRowBuilder().addComponents(exportButton);
}

/**
 * Create complete user interface buttons
 * @param {number} totalPages - Total pages
 * @param {number} page - Current page
 * @returns {Array} - Array of action rows
 */
function createUserInterfaceButtons(totalPages, page = 1) {
  const components = [];

  if (totalPages > 1) {
    components.push(createPaginationButtons(page, totalPages));
  }

  if (totalPages > 0) {
    components.push(createExportButton());
  }

  return components;
}

/**
 * Create second server join button
 * @returns {ActionRowBuilder} - Button row
 */
function createSecondServerJoinButton() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("second_server_join")
      .setLabel("Join")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🔑")
  );

  return row;
}

module.exports = {
  createJoinButton,
  createSecondServerJoinButton,
  createPaginationButtons,
  createExportButton,
  createUserInterfaceButtons,
};
