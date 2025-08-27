/**
 * Modal Handlers
 * Handles Discord modal submission events
 */

const logger = require("../utils/logger");
const seolaxyApi = require("../services/seolaxyApi");
const userService = require("../services/userService");
const { createRegistrationSuccessEmbed } = require("../components/embeds");
const { updateUsersEmbed } = require("./buttons");

/**
 * Handle join modal submission
 * @param {Interaction} interaction - Discord interaction
 */
async function handleJoinModal(interaction) {
  await interaction.deferReply({ flags: 64 }); // 64 = EPHEMERAL flag

  // Extract form data
  const firstName = interaction.fields.getTextInputValue("first_name");
  const lastName = interaction.fields.getTextInputValue("last_name");
  const email = interaction.fields.getTextInputValue("email");
  const projectName =
    interaction.fields.getTextInputValue("project_name") || "searching";
  const invoiceNumber = interaction.fields.getTextInputValue("invoice_number");

  logger.info(
    `Processing registration for ${interaction.user.tag}: ${firstName} ${lastName}`
  );

  try {
    const guild = interaction.guild;
    const member = interaction.member;

    // 1. Validate payment intent
    const isInvoiceValid = await seolaxyApi.validatePaymentIntent(
      invoiceNumber
    );

    // 2. Process user registration
    const userData = {
      discordId: interaction.user.id,
      discordUsername: interaction.user.tag,
      firstName,
      lastName,
      email,
      projectName,
      invoiceNumber,
    };

    const registrationResult = await userService.processUserRegistration(
      userData,
      member,
      guild
    );

    // 3. Update users embed if user was saved successfully
    if (registrationResult.saved && isInvoiceValid) {
      try {
        await updateUsersEmbed();
      } catch (embedError) {
        logger.error(
          `Error updating users embed after registration: ${embedError.message}`
        );
      }
    }

    // 4. Send confirmation message
    const embed = createRegistrationSuccessEmbed({
      nickname: registrationResult.nickname,
      isValid: isInvoiceValid,
      memberRoleName: registrationResult.memberRoleName,
    });

    await interaction.editReply({
      embeds: [embed],
    });
  } catch (error) {
    logger.error(`Error processing registration: ${error.message}`);
    await interaction.editReply({
      content:
        "❌ There was an error processing your registration. Please try again or contact an administrator.",
    });
  }
}

/**
 * Main modal handler router
 * @param {Interaction} interaction - Discord interaction
 */
async function handleModal(interaction) {
  try {
    switch (interaction.customId) {
      case "join_modal":
        await handleJoinModal(interaction);
        break;
      default:
        logger.warn(`Unknown modal interaction: ${interaction.customId}`);
    }
  } catch (error) {
    logger.error(`Error handling modal interaction: ${error.message}`);
  }
}

module.exports = {
  handleModal,
  handleJoinModal,
};
