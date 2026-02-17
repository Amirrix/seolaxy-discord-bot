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
    .setLabel("Email Address")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder("your.google.account@gmail.com");

  const projectNameInput = new TextInputBuilder()
    .setCustomId("project_name")
    .setLabel("Project/Client URL (optional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(100)
    .setPlaceholder("Enter 'searching' if you don't have a client.");

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

/**
 * Create Mentorship #2 registration modal (Croatian)
 * @returns {ModalBuilder} - Mentorship #2 registration modal
 */
function createMentorship2Modal() {
  const modal = new ModalBuilder()
    .setCustomId("mentorship2_join_modal")
    .setTitle("Registracijski obrazac");

  const firstNameInput = new TextInputBuilder()
    .setCustomId("first_name")
    .setLabel("Ime")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const lastNameInput = new TextInputBuilder()
    .setCustomId("last_name")
    .setLabel("Prezime")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const emailInput = new TextInputBuilder()
    .setCustomId("email")
    .setLabel("Email adresa")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder("tvoj.google.account@gmail.com");

  const projectNameInput = new TextInputBuilder()
    .setCustomId("project_name")
    .setLabel("Projekat/Klijent URL (opcionalno)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(100)
    .setPlaceholder("Unesi 'searching' ako nemaš projekat/klijenta.");

  const invoiceInput = new TextInputBuilder()
    .setCustomId("invoice_number")
    .setLabel("Broj fakture")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder("SM-XXXX/2026");

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
  createMentorship2Modal,
};
