/**
 * User Service
 * Handles user-related operations and management
 */

const database = require("./database");
const logger = require("../utils/logger");
const ROLES = require("../constants/roles");
const CHANNELS = require("../constants/channels");

/**
 * Generate invite link to second server and send DM to English user
 * @param {Object} userData - User data object
 * @param {Object} member - Discord guild member
 * @returns {Object} - Invite generation result
 */
async function handleEnglishUserInvite(userData, member) {
  const result = {
    inviteSent: false,
    inviteUrl: null,
    error: null,
  };

  try {
    // Get client instance from the module cache
    const { client } = require("../index");
    if (!client || !client.guilds) {
      logger.warn("Client not available for generating invite");
      result.error = "Client not available";
      return result;
    }

    // Get the second server (SEOLAXY EN)
    const secondServer = await client.guilds.fetch(CHANNELS.SECOND_SERVER_ID);
    if (!secondServer) {
      logger.error(
        `Could not find second server with ID: ${CHANNELS.SECOND_SERVER_ID}`
      );
      result.error = "Second server not found";
      return result;
    }

    // Get a text channel from the second server to create invite
    const textChannel = secondServer.channels.cache.find(
      (channel) =>
        channel.type === 0 &&
        channel
          .permissionsFor(secondServer.members.me)
          .has(["CREATE_INSTANT_INVITE"])
    );

    if (!textChannel) {
      logger.error(
        "No suitable channel found in second server to create invite"
      );
      result.error = "No suitable channel found";
      return result;
    }

    // Create 1-time use invite
    const invite = await textChannel.createInvite({
      maxUses: 1,
      maxAge: 86400, // 24 hours
      unique: true,
      reason: `One-time invite for verified English user ${userData.discordUsername}`,
    });

    result.inviteUrl = invite.url;
    logger.info(
      `Created invite for English user ${userData.discordUsername}: ${invite.url}`
    );

    // Send DM to user
    try {
      const dmMessage = `🎉 **Welcome to Seolaxy!**

Your registration has been successful! As an English speaker, you've been invited to our dedicated English server.

**🔗 Your Personal Invite Link:**
${invite.url}

⚠️ **Important:** This link is for one-time use only and expires in 24 hours. Click it to join the SEOLAXY (EN) server where you'll find all English-speaking members and content.

Welcome aboard! 🚀`;

      await member.send(dmMessage);
      result.inviteSent = true;
      logger.info(
        `Successfully sent DM with invite link to ${userData.discordUsername}`
      );
    } catch (dmError) {
      logger.warn(
        `Could not send DM to ${userData.discordUsername}: ${dmError.message}`
      );
      result.error = "Could not send DM";
      // Still mark invite as created even if DM fails
    }

    return result;
  } catch (error) {
    logger.error(
      `Error handling English user invite for ${userData.discordUsername}: ${error.message}`
    );
    result.error = error.message;
    return result;
  }
}

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
    inviteInfo: null, // For English users
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

    // 4. Handle English users - generate invite and send DM
    if (
      result.userLanguage === "english" &&
      result.saved &&
      roleResult.success
    ) {
      logger.info(
        `Processing English user invite for ${userData.discordUsername}`
      );
      const inviteResult = await handleEnglishUserInvite(userData, member);
      result.inviteInfo = inviteResult;

      if (inviteResult.inviteSent) {
        logger.info(
          `Successfully processed English user ${userData.discordUsername} with invite`
        );
      } else {
        logger.warn(
          `Invite processing had issues for ${userData.discordUsername}: ${inviteResult.error}`
        );
      }
    }

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
      // Skip role assignment for English users - they will be invited to second server
      result.roleName = "English Member (Redirected to EN Server)";
      result.userLanguage = "english";
      result.success = true; // Mark as successful but don't assign role

      // Remove unverified role only
      if (unverifiedRole && member.roles.cache.has(ROLES.UNVERIFIED)) {
        await member.roles.remove(unverifiedRole);
        logger.info(
          `Removed unverified role from ${member.user.tag} (English user - no member role assigned)`
        );
      }

      return result; // Early return - skip member role assignment
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
