/**
 * User Service
 * Handles user-related operations and management
 */

const database = require("./database");
const logger = require("../utils/logger");
const ROLES = require("../constants/roles");

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
    }

    // 3. Assign appropriate member role
    const roleResult = await assignMemberRole(member, guild);
    result.roleAssigned = roleResult.success;
    result.memberRoleName = roleResult.roleName;

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
  const result = { success: false, roleName: null };

  try {
    const unverifiedRole = guild.roles.cache.get(ROLES.UNVERIFIED);
    let memberRole;

    // Determine which language role the user has and assign appropriate member role
    if (member.roles.cache.has(ROLES.ENGLISH)) {
      memberRole = guild.roles.cache.get(ROLES.ENGLISH_MEMBER);
      result.roleName = "English Member";
    } else if (member.roles.cache.has(ROLES.BOSNIAN_CROATIAN_SERBIAN)) {
      memberRole = guild.roles.cache.get(ROLES.BOSNIAN_CROATIAN_SERBIAN_MEMBER);
      result.roleName = "Bosnian/Croatian/Serbian Member";
    } else {
      // Fallback to legacy member role if no language role found
      memberRole = guild.roles.cache.get(ROLES.MEMBER);
      result.roleName = "Member (No language role detected)";
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
