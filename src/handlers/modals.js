/**
 * Modal Handlers
 * Handles Discord modal submission events
 */

const logger = require("../utils/logger");
const seolaxyApi = require("../services/seolaxyApi");
const userService = require("../services/userService");
const database = require("../services/database");
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

    // 1. Validate payment intent with Seolaxy API
    const validationResult = await seolaxyApi.validatePaymentIntent(
      invoiceNumber
    );

    // Handle validation errors with specific user feedback
    if (!validationResult.success) {
      let errorMessage;

      switch (validationResult.error) {
        case "already_enrolled":
          errorMessage =
            "❌ **Already Enrolled:** This purchase has already been used for Discord enrollment.";
          break;
        case "purchase_not_found":
          errorMessage =
            "❌ **Purchase Not Found:** No valid purchase found for the provided payment intent ID or invoice number. Please check your input and try again.";
          break;
        case "invalid_format":
          errorMessage =
            "❌ **Invalid Format:** Payment intent must start with 'pi' or invoice number must start with 'SM'. Please check your input.";
          break;
        case "configuration_error":
        case "api_error":
        case "network_error":
        case "unexpected_response":
        default:
          errorMessage = `❌ **Service Error:** ${validationResult.message} Please try again later or contact an administrator.`;
          break;
      }

      await interaction.editReply({
        content: errorMessage,
      });
      return;
    }

    // 2. Check if payment intent is already used (security check) - only for successful validations
    const paymentIntentExists = await database.checkPaymentIntentExists(
      invoiceNumber
    );

    if (paymentIntentExists) {
      logger.warn(
        `Duplicate payment intent attempted by ${interaction.user.tag}: ${invoiceNumber}`
      );

      await interaction.editReply({
        content:
          "❌ **Security Alert:** This payment intent has already been used for registration. Each payment intent can only be used once. If you believe this is an error, please contact an administrator.",
      });
      return;
    }

    // 3. Process user registration
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

    // 4. Update users embed if user was saved successfully
    if (registrationResult.saved && validationResult.success) {
      try {
        await updateUsersEmbed();
      } catch (embedError) {
        logger.error(
          `Error updating users embed after registration: ${embedError.message}`
        );
      }
    }

    // 5. Send confirmation message
    const embed = createRegistrationSuccessEmbed({
      nickname: registrationResult.nickname,
      isValid: validationResult.success,
      memberRoleName: registrationResult.memberRoleName,
      userLanguage: registrationResult.userLanguage,
      inviteInfo: registrationResult.inviteInfo,
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
