/**
 * Modal Components
 * Contains all Discord modal templates
 */

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");

/**
 * Create registration modal
 * @returns {ModalBuilder} - Registration modal
 */
function createRegistrationModal() {
  const modal = new ModalBuilder()
    .setCustomId("join_modal")
    .setTitle("Member Registration Form");

  // Create text input fields
  const firstNameInput = new TextInputBuilder()
    .setCustomId("first_name")
    .setLabel("First Name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const lastNameInput = new TextInputBuilder()
    .setCustomId("last_name")
    .setLabel("Last Name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const emailInput = new TextInputBuilder()
    .setCustomId("email")
    .setLabel("Google Account email address")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder("your.google.account@gmail.com");

  const projectNameInput = new TextInputBuilder()
    .setCustomId("project_name")
    .setLabel("Project Name (Optional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(100)
    .setPlaceholder("Leave blank if you're searching for a project");

  const invoiceInput = new TextInputBuilder()
    .setCustomId("invoice_number")
    .setLabel("Invoice Number")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder("pi_1A2B3C4D5E6F7G8H9I0J");

  // Create action rows for each input
  const firstRow = new ActionRowBuilder().addComponents(firstNameInput);
  const secondRow = new ActionRowBuilder().addComponents(lastNameInput);
  const thirdRow = new ActionRowBuilder().addComponents(emailInput);
  const fourthRow = new ActionRowBuilder().addComponents(projectNameInput);
  const fifthRow = new ActionRowBuilder().addComponents(invoiceInput);

  modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

  return modal;
}

module.exports = {
  createRegistrationModal,
};
