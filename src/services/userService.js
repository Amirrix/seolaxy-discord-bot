/**
 * User Service
 * Handles user-related operations and management
 */

const database = require("./database");
const logger = require("../utils/logger");
const ROLES = require("../constants/roles");
const CHANNELS = require("../constants/channels");

/**
 * Send notification to staff about nickname length error
 * @param {Object} userData - User data object
 * @param {string} attemptedNickname - The nickname that was too long
 * @param {Object} guild - Discord guild
 */
async function notifyStaffAboutNicknameError(
  userData,
  attemptedNickname,
  guild
) {
  try {
    // Get client instance from the module cache
    const { client } = require("../index");
    if (!client || !client.channels) {
      logger.warn("Client not available for sending staff notification");
      return;
    }

    const staffChannel = await client.channels.fetch(CHANNELS.STAFF_CHANNEL_ID);
    if (!staffChannel) {
      logger.error(
        `Could not find staff channel with ID: ${CHANNELS.STAFF_CHANNEL_ID}`
      );
      return;
    }

    const message = `<@&${ROLES.STAFF}> 🚨 **Nickname Length Error**

**User:** ${userData.discordUsername} (${userData.firstName} ${userData.lastName})
**Attempted Nickname:** \`${attemptedNickname}\`
**Length:** ${attemptedNickname.length} characters (max: 32)
**Project:** ${userData.projectName}

The nickname is too long and needs manual adjustment.`;

    await staffChannel.send(message);
    logger.info(
      `Staff notified about nickname length error for user ${userData.discordUsername}`
    );
  } catch (error) {
    logger.error(
      `Error sending staff notification for nickname error: ${error.message}`
    );
  }
}

/**
 * Process user registration
 * @param {Object} userData - User registration data
 * @param {Object} member - Discord guild member
 * @param {Object} guild - Discord guild
 * @returns {Object} - Processing result
 */
async function processUserRegistration(userData, member, guild) {
  const result = {
    saved: false,
    roleAssigned: false,
    memberRoleName: null,
    nickname: null,
    userLanguage: null,
  };

  try {
    // 1. Save user to database
    const savedToDb = await database.saveUser(userData);
    result.saved = savedToDb;

    if (savedToDb) {
      logger.info(
        `User ${userData.discordUsername} saved to database successfully`
      );
    } else {
      logger.warn(
        `Failed to save user ${userData.discordUsername} to database`
      );
    }

    // 2. Change nickname
    const newNickname = `${userData.firstName} ${userData.lastName} [${userData.projectName}]`;
    try {
      await member.setNickname(newNickname);
      result.nickname = newNickname;
      logger.info(
        `Changed nickname for ${userData.discordUsername} to: ${newNickname}`
      );
    } catch (error) {
      logger.warn(
        `Could not change nickname for ${userData.discordUsername}: ${error.message}`
      );

      // Check if this is a nickname length error and notify staff
      if (error.message && error.message.includes("BASE_TYPE_MAX_LENGTH")) {
        await notifyStaffAboutNicknameError(userData, newNickname, guild);
      }
    }

    // 3. Assign appropriate member role
    const roleResult = await assignMemberRole(member, guild);
    result.roleAssigned = roleResult.success;
    result.memberRoleName = roleResult.roleName;
    result.userLanguage = roleResult.userLanguage;

    return result;
  } catch (error) {
    logger.error(`Error processing user registration: ${error.message}`);
    return result;
  }
}

/**
 * Assign appropriate member role based on language role
 * @param {Object} member - Discord guild member
 * @param {Object} guild - Discord guild
 * @returns {Object} - Role assignment result
 */
async function assignMemberRole(member, guild) {
  const result = { success: false, roleName: null, userLanguage: null };

  try {
    const unverifiedRole = guild.roles.cache.get(ROLES.UNVERIFIED);
    let memberRole;

    // Determine which language role the user has and assign appropriate member role
    if (member.roles.cache.has(ROLES.ENGLISH)) {
      memberRole = guild.roles.cache.get(ROLES.ENGLISH_MEMBER);
      result.roleName = "English Member";
      result.userLanguage = "english";
    } else if (member.roles.cache.has(ROLES.BOSNIAN_CROATIAN_SERBIAN)) {
      memberRole = guild.roles.cache.get(ROLES.BOSNIAN_CROATIAN_SERBIAN_MEMBER);
      result.roleName = "Bosnian/Croatian/Serbian Member";
      result.userLanguage = "bosnian";
    } else {
      // Fallback to legacy member role if no language role found
      memberRole = guild.roles.cache.get(ROLES.MEMBER);
      result.roleName = "Member (No language role detected)";
      result.userLanguage = "unknown";
      logger.warn(
        `User ${member.user.tag} has no language role, using legacy member role`
      );

      // If legacy member role doesn't exist, log available roles for debugging
      if (!memberRole) {
        const availableRoles = guild.roles.cache
          .map((role) => `${role.name} (${role.id})`)
          .join(", ");
        logger.error(
          `Legacy member role not found! Available roles: ${availableRoles}`
        );
      }
    }

    if (memberRole) {
      // Remove unverified role if user has it
      if (unverifiedRole && member.roles.cache.has(ROLES.UNVERIFIED)) {
        await member.roles.remove(unverifiedRole);
        logger.info(`Removed unverified role from ${member.user.tag}`);
      }

      // Add appropriate member role
      await member.roles.add(memberRole);
      logger.info(`Assigned ${result.roleName} role to ${member.user.tag}`);
      result.success = true;
    } else {
      logger.error(`Could not find member role for ${member.user.tag}`);
    }

    return result;
  } catch (error) {
    logger.error(`Error assigning member role: ${error.message}`);
    return result;
  }
}

module.exports = {
  processUserRegistration,
  assignMemberRole,
};
