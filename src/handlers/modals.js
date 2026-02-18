/**
 * Modal Handlers
 * Handles Discord modal submission events
 */

const logger = require("../utils/logger");
const seolaxyApi = require("../services/seolaxyApi");
const userService = require("../services/userService");
const database = require("../services/database");
const ROLES = require("../constants/roles");
const {
  createRegistrationSuccessEmbed,
  createMentorship2SuccessEmbed,
} = require("../components/embeds");
const { updateUsersEmbed, updateMentorship2UsersEmbed } = require("./buttons");

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

    // 4. Update users embed if user was saved successfully (only for main server)
    const CHANNELS = require("../constants/channels");
    const isEnglishServer = guild.id === CHANNELS.SECOND_SERVER_ID;

    if (
      registrationResult.saved &&
      validationResult.success &&
      !isEnglishServer
    ) {
      try {
        await updateUsersEmbed();
      } catch (embedError) {
        logger.error(
          `Error updating users embed after registration: ${embedError.message}`
        );
      }
    } else if (isEnglishServer) {
      logger.info(
        `User registered on English server - skipping main server users embed update`
      );
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
 * Build a nickname that fits within Discord's 32-char limit
 * Shortens the project name as needed
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @param {string} projectName - Project name
 * @returns {string} - Nickname that fits within 32 chars
 */
function buildNickname(firstName, lastName, projectName) {
  const fullNickname = `${firstName} ${lastName} [${projectName}]`;
  if (fullNickname.length <= 32) {
    return fullNickname;
  }

  const baseLength = `${firstName} ${lastName} []`.length;
  const availableForProject = 32 - baseLength;

  if (availableForProject >= 1) {
    return `${firstName} ${lastName} [${projectName.substring(0, availableForProject)}]`;
  }

  // Even the name + brackets is too long, truncate last name
  const minBase = `${firstName}  []`.length; // space + brackets
  const availableForLastName = 32 - minBase;
  if (availableForLastName >= 1) {
    return `${firstName} ${lastName.substring(0, availableForLastName)} []`;
  }

  // Extreme edge case: just use first name
  return firstName.substring(0, 32);
}

/**
 * Handle Mentorship #2 join modal submission
 * @param {Interaction} interaction - Discord interaction
 */
async function handleMentorship2JoinModal(interaction) {
  await interaction.deferReply({ flags: 64 });

  const firstName = interaction.fields.getTextInputValue("first_name");
  const lastName = interaction.fields.getTextInputValue("last_name");
  const email = interaction.fields.getTextInputValue("email");
  const projectName =
    interaction.fields.getTextInputValue("project_name") || "searching";
  const invoiceNumber =
    interaction.fields.getTextInputValue("invoice_number");

  logger.info(
    `Processing Mentorship #2 registration for ${interaction.user.tag}: ${firstName} ${lastName}`
  );

  try {
    const guild = interaction.guild;
    const member = interaction.member;

    // 1. Validate invoice with Seolaxy API using Mentorship #2 JWT
    const validationResult =
      await seolaxyApi.validateMentorship2Payment(invoiceNumber);

    if (!validationResult.success) {
      let errorMessage;

      switch (validationResult.error) {
        case "already_enrolled":
          errorMessage =
            "❌ **Već registrirano:** Ova kupovina je već korištena za Discord registraciju.";
          break;
        case "purchase_not_found":
          errorMessage =
            "❌ **Kupovina nije pronađena:** Nije pronađena valjana kupovina za navedeni broj fakture. Molimo provjerite unos i pokušajte ponovo.";
          break;
        case "invalid_format":
          errorMessage =
            "❌ **Neispravan format:** Broj fakture mora počinjati sa 'SM' ili 'pi'. Molimo provjerite unos.";
          break;
        case "configuration_error":
        case "api_error":
        case "network_error":
        case "unexpected_response":
        default:
          errorMessage = `❌ **Greška servisa:** ${validationResult.message} Pokušajte ponovo kasnije ili kontaktirajte administratora.`;
          break;
      }

      await interaction.editReply({ content: errorMessage });
      return;
    }

    // 2. Check duplicate invoice
    const paymentIntentExists =
      await database.checkPaymentIntentExists(invoiceNumber);

    if (paymentIntentExists) {
      logger.warn(
        `Duplicate invoice attempted by ${interaction.user.tag}: ${invoiceNumber}`
      );
      await interaction.editReply({
        content:
          "❌ **Sigurnosno upozorenje:** Ovaj broj fakture je već korišten za registraciju. Svaki broj fakture može se koristiti samo jednom. Ako mislite da je ovo greška, kontaktirajte administratora.",
      });
      return;
    }

    // 3. Save user to database
    const userData = {
      discordId: interaction.user.id,
      discordUsername: interaction.user.tag,
      firstName,
      lastName,
      email,
      projectName,
      invoiceNumber,
    };

    const savedToDb = await database.saveUser(userData);

    // 4. Set nickname with auto-truncation
    const nickname = buildNickname(firstName, lastName, projectName);
    let nicknameSet = false;
    try {
      await member.setNickname(nickname);
      nicknameSet = true;
      logger.info(
        `Set M2 nickname for ${interaction.user.tag} to: ${nickname}`
      );
    } catch (error) {
      logger.warn(
        `Could not set M2 nickname for ${interaction.user.tag}: ${error.message}`
      );
    }

    // 5. Assign Mentorship #2 verified role
    let roleAssigned = false;
    try {
      const verifiedRole = guild.roles.cache.get(ROLES.MENTORSHIP2_VERIFIED);
      if (verifiedRole) {
        await member.roles.add(verifiedRole);
        roleAssigned = true;
        logger.info(
          `Assigned Mentorship #2 verified role to ${interaction.user.tag}`
        );
      } else {
        logger.error(
          `Mentorship #2 verified role not found: ${ROLES.MENTORSHIP2_VERIFIED}`
        );
      }
    } catch (roleError) {
      logger.error(
        `Error assigning M2 role to ${interaction.user.tag}: ${roleError.message}`
      );
    }

    // 6. Update Mentorship #2 users embed
    if (savedToDb) {
      try {
        await updateMentorship2UsersEmbed();
      } catch (embedError) {
        logger.error(
          `Error updating M2 users embed after registration: ${embedError.message}`
        );
      }
    }

    // 7. Send success embed with Thinkific instructions
    const successEmbed = createMentorship2SuccessEmbed({
      nickname: nicknameSet ? nickname : null,
      roleAssigned,
    });

    await interaction.editReply({ embeds: [successEmbed] });

    logger.info(
      `Mentorship #2 registration completed for ${interaction.user.tag}`
    );
  } catch (error) {
    logger.error(
      `Error processing M2 registration: ${error.message}`
    );
    await interaction.editReply({
      content:
        "❌ Došlo je do greške pri obradi registracije. Pokušajte ponovo ili kontaktirajte administratora.",
    });
  }
}

/**
 * Handle Mentorship #2 "Remove user" modal submission
 * @param {Interaction} interaction - Discord interaction
 */
async function handleMentorship2RemoveUserModal(interaction) {
  await interaction.deferReply({ flags: 64 });

  const identifier = interaction.fields.getTextInputValue("identifier").trim();
  if (!identifier) {
    await interaction.editReply({
      content: "❌ Unesi broj fakture ili Discord ID.",
    });
    return;
  }

  const user = await database.findUserByIdentifier(identifier);
  if (!user) {
    await interaction.editReply({
      content: "❌ Korisnik nije pronađen u bazi.",
    });
    return;
  }

  if (!user.invoice_number || !user.invoice_number.match(/^SM-.+\/2026$/)) {
    await interaction.editReply({
      content:
        "❌ Korisnik nije iz Mentorship #2 (broj fakture mora biti SM-.../2026).",
    });
    return;
  }

  const deleted = await database.deleteUser(user.discord_id);
  if (!deleted) {
    await interaction.editReply({
      content: "❌ Greška pri brisanju korisnika iz baze.",
    });
    return;
  }

  try {
    const member = await interaction.guild.members.fetch(user.discord_id).catch(() => null);
    if (member) {
      const role = interaction.guild.roles.cache.get(ROLES.MENTORSHIP2_VERIFIED);
      if (role && member.roles.cache.has(ROLES.MENTORSHIP2_VERIFIED)) {
        await member.roles.remove(role);
        logger.info(`Removed M2 verified role from ${user.discord_username}`);
      }
    }
  } catch (err) {
    logger.warn(`Could not remove role from member: ${err.message}`);
  }

  await updateMentorship2UsersEmbed();
  await interaction.editReply({
    content: `✅ Korisnik **${user.first_name} ${user.last_name}** (${user.invoice_number}) je uklonjen.`,
  });
  logger.info(`M2 user removed by ${interaction.user.tag}: ${user.discord_id}`);
}

/**
 * Handle Mentorship #2 "Edit user" modal submission
 * @param {Interaction} interaction - Discord interaction
 */
async function handleMentorship2EditUserModal(interaction) {
  await interaction.deferReply({ flags: 64 });

  const identifier = interaction.fields.getTextInputValue("identifier").trim();
  if (!identifier) {
    await interaction.editReply({
      content: "❌ Unesi broj fakture ili Discord ID.",
    });
    return;
  }

  const user = await database.findUserByIdentifier(identifier);
  if (!user) {
    await interaction.editReply({
      content: "❌ Korisnik nije pronađen u bazi.",
    });
    return;
  }

  if (!user.invoice_number || !user.invoice_number.match(/^SM-.+\/2026$/)) {
    await interaction.editReply({
      content:
        "❌ Korisnik nije iz Mentorship #2 (broj fakture mora biti SM-.../2026).",
    });
    return;
  }

  const first_name = interaction.fields.getTextInputValue("first_name")?.trim() || null;
  const last_name = interaction.fields.getTextInputValue("last_name")?.trim() || null;
  const email = interaction.fields.getTextInputValue("email")?.trim() || null;
  const project_name = interaction.fields.getTextInputValue("project_name")?.trim() || null;

  const updates = {};
  if (first_name !== null && first_name !== "") updates.first_name = first_name;
  if (last_name !== null && last_name !== "") updates.last_name = last_name;
  if (email !== null && email !== "") updates.email = email;
  if (project_name !== null && project_name !== "") updates.project_name = project_name;

  if (Object.keys(updates).length === 0) {
    await interaction.editReply({
      content: "❌ Nisi unio nijedno polje za ažuriranje.",
    });
    return;
  }

  const updated = await database.updateUser(user.discord_id, updates);
  if (!updated) {
    await interaction.editReply({
      content: "❌ Greška pri ažuriranju korisnika.",
    });
    return;
  }

  const newFirstName = updates.first_name ?? user.first_name;
  const newLastName = updates.last_name ?? user.last_name;
  const newProjectName = updates.project_name ?? user.project_name ?? "searching";

  try {
    const member = await interaction.guild.members.fetch(user.discord_id).catch(() => null);
    if (member) {
      const nickname = buildNickname(newFirstName, newLastName, newProjectName);
      await member.setNickname(nickname);
      logger.info(`Updated M2 nickname for ${user.discord_username} to ${nickname}`);
    }
  } catch (err) {
    logger.warn(`Could not set nickname: ${err.message}`);
  }

  await updateMentorship2UsersEmbed();
  await interaction.editReply({
    content: `✅ Korisnik **${user.first_name} ${user.last_name}** je ažuriran.`,
  });
  logger.info(`M2 user edited by ${interaction.user.tag}: ${user.discord_id}`);
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
      case "mentorship2_join_modal":
        await handleMentorship2JoinModal(interaction);
        break;
      case "m2_remove_user_modal":
        await handleMentorship2RemoveUserModal(interaction);
        break;
      case "m2_edit_user_modal":
        await handleMentorship2EditUserModal(interaction);
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
  handleMentorship2JoinModal,
  handleMentorship2RemoveUserModal,
  handleMentorship2EditUserModal,
};
