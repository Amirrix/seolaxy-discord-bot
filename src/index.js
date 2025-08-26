const {
  Client,
  GatewayIntentBits,
  Events,
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
require("dotenv").config();

// Import command deployment function
const { deployCommands } = require("../scripts/deploy-commands");

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

// Bot configuration
const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  logLevel: process.env.LOG_LEVEL || "info",
};

// Role IDs for language and member roles
const ROLES = {
  ENGLISH: "1409879924180783225",
  BOSNIAN_CROATIAN_SERBIAN: "1409880194424115260",
  MEMBER: "1409879830408859809",
};

// Channel IDs
const JOIN_CHANNEL_ID = "1409606552402268180";
const LANGUAGE_CHANNEL_ID = "1409926327934652517";

// Logging utility
const log = {
  info: (message) =>
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
  warn: (message) =>
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`),
  error: (message) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`),
  debug: (message) => {
    if (config.logLevel === "debug") {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
    }
  },
};

// Validate environment variables
function validateConfig() {
  const required = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    log.error(`Missing required environment variables: ${missing.join(", ")}`);
    log.error(
      "Please check your .env file and ensure all required variables are set."
    );
    process.exit(1);
  }

  log.info("Configuration validated successfully");
}

// Event: Bot is ready
client.once(Events.ClientReady, async (readyClient) => {
  log.info(`🎉 Bot is ready! Logged in as ${readyClient.user.tag}`);
  log.info(`🌐 Connected to ${readyClient.guilds.cache.size} guild(s)`);

  // Set bot activity status
  client.user.setActivity("for new members", {
    type: "WATCHING",
  });

  // Send messages to their respective channels
  try {
    // Send language selection message to language channel
    const languageChannel = await client.channels.fetch(LANGUAGE_CHANNEL_ID);
    if (languageChannel) {
      await sendLanguageSelectionMessage(languageChannel);
      log.info(
        `✅ Language selection message sent to channel #${languageChannel.name}`
      );
    } else {
      log.error(
        `❌ Could not find language channel with ID: ${LANGUAGE_CHANNEL_ID}`
      );
    }

    // Send join message to join channel
    const joinChannel = await client.channels.fetch(JOIN_CHANNEL_ID);
    if (joinChannel) {
      await sendJoinMessage(joinChannel);
      log.info(`✅ Join message sent to channel #${joinChannel.name}`);
    } else {
      log.error(`❌ Could not find join channel with ID: ${JOIN_CHANNEL_ID}`);
    }
  } catch (error) {
    log.error(`❌ Error sending messages: ${error.message}`);
  }
});

// Event: Handle interactions (commands, buttons, modals)
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      // Handle slash commands
      log.debug(
        `Received command: ${interaction.commandName} from ${interaction.user.tag}`
      );

      switch (interaction.commandName) {
        case "hello":
          await handleHelloCommand(interaction);
          break;
        default:
          log.warn(`Unknown command: ${interaction.commandName}`);
          await interaction.reply({
            content: "❌ Unknown command!",
            ephemeral: true,
          });
      }
    } else if (interaction.isButton()) {
      // Handle button interactions
      if (interaction.customId === "join_button") {
        await handleJoinButton(interaction);
      } else if (interaction.customId === "english_button") {
        await handleLanguageSelection(interaction, "english");
      } else if (interaction.customId === "bcs_button") {
        await handleLanguageSelection(interaction, "bcs");
      }
    } else if (interaction.isModalSubmit()) {
      // Handle modal form submissions
      if (interaction.customId === "join_modal") {
        await handleJoinModal(interaction);
      }
    }
  } catch (error) {
    log.error(`Error handling interaction: ${error.message}`);

    const errorMessage = {
      content: "❌ There was an error while executing this command!",
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Command handlers
async function handleHelloCommand(interaction) {
  const user = interaction.user;
  const channel = interaction.channel;

  log.info(`Hello command executed by ${user.tag} in #${channel.name}`);

  await interaction.reply({
    content: `👋 Hello world! Nice to meet you, ${user.displayName}!`,
    ephemeral: false, // Set to true if you want only the user to see the response
  });
}

// Function to send language selection message to a channel
async function sendLanguageSelectionMessage(channel) {
  // Create the language selection embed
  const embed = new EmbedBuilder()
    .setTitle("🌍 Select Your Language")
    .setDescription(
      "To proceed and access our community, please select your preferred language by clicking one of the buttons below:"
    )
    .addFields(
      {
        name: "🇺🇸 English",
        value: "Select if you prefer English",
        inline: true,
      },
      {
        name: "🇧🇦 Bosnian/Croatian/Serbian",
        value: "Select if you prefer BCS languages",
        inline: true,
      }
    )
    .setColor(0x0099ff)
    .setFooter({ text: "You must select a language to continue!" })
    .setTimestamp();

  // Create language selection buttons
  const englishButton = new ButtonBuilder()
    .setCustomId("english_button")
    .setLabel("English")
    .setEmoji("🇺🇸")
    .setStyle(ButtonStyle.Primary);

  const bcsButton = new ButtonBuilder()
    .setCustomId("bcs_button")
    .setLabel("Bosnian/Croatian/Serbian")
    .setEmoji("🇧🇦")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(englishButton, bcsButton);

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

// Function to send join message to a channel
async function sendJoinMessage(channel) {
  // Create the embed
  const embed = new EmbedBuilder()
    .setTitle("🚀 Join Our Community!")
    .setDescription(
      "Welcome! To join our community, you'll need to fill out a registration form with the following information:\n\n⚠️ **Important**: You must first select your language in <#1409926327934652517> before getting full access to the server!"
    )
    .addFields(
      { name: "📝 Required Information", value: "\u200B", inline: false },
      { name: "First Name", value: "Your first name", inline: true },
      { name: "Last Name", value: "Your last name", inline: true },
      {
        name: "Project Name",
        value: "Optional - Leave blank if searching",
        inline: true,
      },
      {
        name: "Invoice Number",
        value: "Your invoice number for verification",
        inline: true,
      },
      { name: "\u200B", value: "\u200B", inline: true },
      { name: "\u200B", value: "\u200B", inline: true }
    )
    .setColor(0x00ae86)
    .setFooter({ text: "Click the button below to get started!" })
    .setTimestamp();

  // Create the join button with key emoji
  const joinButton = new ButtonBuilder()
    .setCustomId("join_button")
    .setLabel("Join")
    .setEmoji("🔑")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(joinButton);

  await channel.send({
    embeds: [embed],
    components: [row],
  });
}

async function handleJoinButton(interaction) {
  log.info(`Join button clicked by ${interaction.user.tag}`);

  // Create the modal form
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
    .setMaxLength(50);

  // Create action rows for each input
  const firstRow = new ActionRowBuilder().addComponents(firstNameInput);
  const secondRow = new ActionRowBuilder().addComponents(lastNameInput);
  const thirdRow = new ActionRowBuilder().addComponents(projectNameInput);
  const fourthRow = new ActionRowBuilder().addComponents(invoiceInput);

  modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

  await interaction.showModal(modal);
}

async function handleLanguageSelection(interaction, language) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const guild = interaction.guild;
    const member = interaction.member;

    let roleId;
    let languageName;

    if (language === "english") {
      roleId = ROLES.ENGLISH;
      languageName = "English";
    } else if (language === "bcs") {
      roleId = ROLES.BOSNIAN_CROATIAN_SERBIAN;
      languageName = "Bosnian/Croatian/Serbian";
    }

    const role = guild.roles.cache.get(roleId);
    if (role) {
      // Check if user already has this role
      if (member.roles.cache.has(roleId)) {
        await interaction.editReply({
          content: `✅ You already have the ${languageName} role!`,
        });
        return;
      }

      // Remove other language roles first (if any)
      const otherLanguageRoles = [
        ROLES.ENGLISH,
        ROLES.BOSNIAN_CROATIAN_SERBIAN,
      ].filter((id) => id !== roleId);
      for (const otherRoleId of otherLanguageRoles) {
        if (member.roles.cache.has(otherRoleId)) {
          const otherRole = guild.roles.cache.get(otherRoleId);
          if (otherRole) {
            await member.roles.remove(otherRole);
            log.info(
              `Removed ${otherRole.name} role from ${interaction.user.tag}`
            );
          }
        }
      }

      // Add the selected language role
      await member.roles.add(role);
      log.info(`Assigned ${languageName} role to ${interaction.user.tag}`);

      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Language Selected!")
        .setDescription(`You have been assigned the **${languageName}** role.`)
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({
        embeds: [successEmbed],
      });
    } else {
      await interaction.editReply({
        content: "❌ Language role not found. Please contact an administrator.",
      });
    }
  } catch (error) {
    log.error(`Error assigning language role: ${error.message}`);
    await interaction.editReply({
      content:
        "❌ There was an error assigning your language role. Please try again or contact an administrator.",
    });
  }
}

async function handleJoinModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const firstName = interaction.fields.getTextInputValue("first_name");
  const lastName = interaction.fields.getTextInputValue("last_name");
  const projectName =
    interaction.fields.getTextInputValue("project_name") || "searching";
  const invoiceNumber = interaction.fields.getTextInputValue("invoice_number");

  log.info(
    `Processing registration for ${interaction.user.tag}: ${firstName} ${lastName}`
  );

  try {
    const guild = interaction.guild;
    const member = interaction.member;

    // 1. Change nickname
    const newNickname = `${firstName} ${lastName} [${projectName}]`;
    try {
      await member.setNickname(newNickname);
      log.info(
        `Changed nickname for ${interaction.user.tag} to: ${newNickname}`
      );
    } catch (error) {
      log.warn(
        `Could not change nickname for ${interaction.user.tag}: ${error.message}`
      );
    }

    // 2. Validate invoice and assign member role
    const isInvoiceValid = await mockApiCall(invoiceNumber);
    if (isInvoiceValid) {
      const memberRole = guild.roles.cache.get(ROLES.MEMBER);
      if (memberRole) {
        await member.roles.add(memberRole);
        log.info(`Assigned member role to ${interaction.user.tag}`);
      }
    }

    // 4. Send confirmation message
    const confirmEmbed = new EmbedBuilder()
      .setTitle("✅ Registration Successful!")
      .setDescription(
        "Welcome to our community! Your registration has been processed."
      )
      .addFields(
        { name: "Nickname", value: newNickname, inline: true },
        {
          name: "Member Status",
          value: isInvoiceValid
            ? "✅ Verified"
            : "❌ Invoice validation failed",
          inline: true,
        }
      )
      .setColor(isInvoiceValid ? 0x00ff00 : 0xff9900)
      .setTimestamp();

    await interaction.editReply({
      embeds: [confirmEmbed],
    });
  } catch (error) {
    log.error(`Error processing registration: ${error.message}`);
    await interaction.editReply({
      content:
        "❌ There was an error processing your registration. Please try again or contact an administrator.",
    });
  }
}

// Mock API call for invoice validation
async function mockApiCall(invoiceNumber) {
  log.info(`Mock API call for invoice: ${invoiceNumber}`);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock validation logic - for demo purposes, let's say invoices starting with "VALID" are valid
  // In real implementation, this would be an actual API call
  const isValid =
    invoiceNumber.toUpperCase().startsWith("VALID") ||
    invoiceNumber.length >= 5; // Simple mock validation

  log.info(`Invoice ${invoiceNumber} validation result: ${isValid}`);
  return isValid;
}

// Error handling
client.on(Events.Error, (error) => {
  log.error(`Discord client error: ${error.message}`);
});

client.on(Events.Warn, (warning) => {
  log.warn(`Discord client warning: ${warning}`);
});

// Handle process termination gracefully
process.on("SIGINT", () => {
  log.info("Received SIGINT. Shutting down gracefully...");
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  log.info("Received SIGTERM. Shutting down gracefully...");
  client.destroy();
  process.exit(0);
});

// Unhandled errors
process.on("unhandledRejection", (reason, promise) => {
  log.error(`Unhandled promise rejection: ${reason}`);
  log.error("Promise:", promise);
});

process.on("uncaughtException", (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  log.error("Stack:", error.stack);
  process.exit(1);
});

// Start the bot
async function startBot() {
  try {
    log.info("🚀 Starting Seolaxy Discord Bot...");

    // Validate configuration
    validateConfig();

    // Auto-deploy commands on startup
    log.info("📋 Auto-deploying slash commands...");
    await deployCommands();
    log.info("✅ Commands deployed successfully!");

    // Login to Discord
    await client.login(config.token);
  } catch (error) {
    log.error(`Failed to start bot: ${error.message}`);
    process.exit(1);
  }
}

// Start the bot if this file is run directly
if (require.main === module) {
  startBot();
}

module.exports = { client, startBot };
