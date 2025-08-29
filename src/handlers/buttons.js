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
 * Handle second server join button click
 * @param {Interaction} interaction - Discord interaction
 */
async function handleSecondServerJoinButton(interaction) {
  const { EmbedBuilder } = require("discord.js");
  const database = require("../services/database");
  const ROLES = require("../constants/roles");
  const discordConfig = require("../config/discord");
  const { client } = require("../index");

  await interaction.deferReply({ flags: 64 }); // Ephemeral reply

  try {
    const discordId = interaction.user.id;
    const member = interaction.member;
    const guild = interaction.guild;

    logger.info(`Second server join button clicked by ${interaction.user.tag}`);

    // Look up user in database
    const userData = await database.getUserByDiscordId(discordId);

    if (!userData) {
      // User not found in database - send them invite to main server
      logger.info(
        `User ${interaction.user.tag} not found in database, sending main server invite`
      );

      try {
        // Get main server and create invite
        const mainServerId = discordConfig.bot.guildId; // Main server ID from env
        const mainServer = await client.guilds.fetch(mainServerId);

        if (mainServer) {
          // Find a suitable channel to create invite from
          const textChannel = mainServer.channels.cache.find(
            (channel) =>
              channel.type === 0 &&
              channel
                .permissionsFor(mainServer.members.me)
                .has(["CREATE_INSTANT_INVITE"])
          );

          if (textChannel) {
            // Create invite to main server
            const invite = await textChannel.createInvite({
              maxAge: 86400, // 24 hours
              maxUses: 1,
              unique: true,
              reason: `Invite for ${interaction.user.tag} to complete verification on main server`,
            });

            // Send DM with invite
            const dmMessage = `🎯 **Join the Main Seolaxy Server First!**

Hi there! It looks like you haven't completed verification on the main Seolaxy server yet.

**🔗 Your Personal Invite to Main Server:**
${invite.url}

**📋 What to do:**
1. Click the link above to join the main Seolaxy server
2. Complete the registration process there
3. Once verified, you'll automatically get an invite to this English server

**⏰ This invite expires in 24 hours and is for one-time use only.**

Welcome to the Seolaxy community! 🚀`;

            try {
              await interaction.user.send(dmMessage);

              await interaction.editReply({
                content:
                  "📨 **Check Your DMs!** I've sent you a personal invite link to the main Seolaxy server where you need to complete verification first.",
              });

              logger.info(
                `Successfully sent main server invite DM to ${interaction.user.tag}`
              );
            } catch (dmError) {
              logger.warn(
                `Could not send DM to ${interaction.user.tag}: ${dmError.message}`
              );

              // Fallback - show invite in the ephemeral reply
              await interaction.editReply({
                content: `❌ **Not Verified Yet!**
                
You need to join and complete verification on the main Seolaxy server first.

**🔗 Join Main Server:** ${invite.url}

Complete registration there, then return here to join the English community!

⚠️ *I couldn't DM you, so here's your personal invite link. This expires in 24 hours.*`,
              });
            }
          } else {
            throw new Error(
              "No suitable channel found in main server to create invite"
            );
          }
        } else {
          throw new Error("Could not access main server");
        }
      } catch (inviteError) {
        logger.error(
          `Error creating main server invite for ${interaction.user.tag}: ${inviteError.message}`
        );

        // Fallback to generic message
        await interaction.editReply({
          content:
            "❌ **Not Found:** You need to be verified on the main Seolaxy server first. Please complete registration there before joining this server.",
        });
      }

      return;
    }

    logger.info(
      `Processing second server setup for verified user: ${userData.discord_username}`
    );

    // Set up nickname
    const newNickname = `${userData.first_name} ${userData.last_name} [${userData.project_name}]`;
    try {
      await member.setNickname(newNickname);
      logger.info(
        `Set nickname for ${userData.discord_username} to: ${newNickname}`
      );
    } catch (error) {
      logger.warn(
        `Could not set nickname for ${userData.discord_username}: ${error.message}`
      );

      // Check if this is a nickname length error
      if (error.message && error.message.includes("BASE_TYPE_MAX_LENGTH")) {
        logger.error(
          `Nickname too long for ${userData.discord_username}: ${newNickname}`
        );
      }
    }

    // Handle role assignment
    const unverifiedRole = guild.roles.cache.get(
      ROLES.SECOND_SERVER_UNVERIFIED
    );
    const verifiedRole = guild.roles.cache.get(ROLES.SECOND_SERVER_VERIFIED);

    let roleResult = { success: false, message: "" };

    try {
      // Remove unverified role if user has it
      if (
        unverifiedRole &&
        member.roles.cache.has(ROLES.SECOND_SERVER_UNVERIFIED)
      ) {
        await member.roles.remove(unverifiedRole);
        logger.info(
          `Removed unverified role from ${userData.discord_username}`
        );
      }

      // Add verified role
      if (verifiedRole) {
        await member.roles.add(verifiedRole);
        logger.info(`Added verified role to ${userData.discord_username}`);
        roleResult.success = true;
        roleResult.message = "✅ Verified Member";
      } else {
        logger.error("Verified role not found in second server");
        roleResult.message = "⚠️ Role assignment failed";
      }
    } catch (roleError) {
      logger.error(
        `Error managing roles for ${userData.discord_username}: ${roleError.message}`
      );
      roleResult.message = "⚠️ Role assignment failed";
    }

    // Send success message
    const embed = new EmbedBuilder()
      .setTitle("🎉 Welcome to SEOLAXY (EN)!")
      .setDescription(
        `Welcome **${userData.first_name} ${userData.last_name}**! Your English server setup is complete.`
      )
      .addFields(
        {
          name: "Nickname",
          value:
            newNickname.length <= 32
              ? newNickname
              : "Could not set nickname (too long)",
          inline: true,
        },
        {
          name: "Status",
          value: roleResult.message,
          inline: true,
        },
        {
          name: "Project",
          value: userData.project_name || "Not specified",
          inline: true,
        }
      )
      .setColor(roleResult.success ? 0x00ff00 : 0xff9900)
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
    });

    logger.info(
      `Second server setup completed for ${userData.discord_username}`
    );
  } catch (error) {
    logger.error(`Error in second server join: ${error.message}`);
    await interaction.editReply({
      content:
        "❌ There was an error setting up your account. Please contact an administrator.",
    });
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
    } else if (interaction.customId === "second_server_join") {
      await handleSecondServerJoinButton(interaction);
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
