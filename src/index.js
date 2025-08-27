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
const mysql = require("mysql2/promise");
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

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "uk03-sql.pebblehost.com",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "customer_1110818_users",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "customer_1110818_users",
  connectionLimit: 10,
  timeout: 60000,
  charset: "utf8mb4",
  ssl: false,
};

// Role IDs for language and member roles
const ROLES = {
  // Language roles (assigned during onboarding)
  ENGLISH: "1409879924180783225",
  BOSNIAN_CROATIAN_SERBIAN: "1409880194424115260",

  // Member roles (assigned after successful verification)
  ENGLISH_MEMBER: "1409936166840696882",
  BOSNIAN_CROATIAN_SERBIAN_MEMBER: "1409936218900267090",

  // Other roles
  MEMBER: "1409879830408859809", // Legacy member role
  UNVERIFIED: "1409929646610583652",
};

// Channel IDs
const JOIN_CHANNEL_ID = "1409606552402268180";
const USERS_CHANNEL_ID = "1410217982579441684";

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

// Database connection pool
let dbPool;

// Store the users embed message ID for updating
let usersEmbedMessageId = null;

// Initialize database connection
async function initDatabase() {
  try {
    dbPool = mysql.createPool(dbConfig);
    log.info("Database connection pool created successfully");

    // Test the connection
    const connection = await dbPool.getConnection();
    await connection.ping();
    connection.release();
    log.info("Database connection test successful");

    // Create users table if it doesn't exist
    await createUsersTable();
  } catch (error) {
    log.error(`Database connection failed: ${error.message}`);
    // Don't exit the process, just log the error
    // The bot can still function without database features
  }
}

// Create users table if it doesn't exist
async function createUsersTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_id VARCHAR(20) UNIQUE NOT NULL,
        discord_username VARCHAR(100) NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL,
        project_name VARCHAR(100),
        invoice_number VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await dbPool.execute(createTableQuery);
    log.info("Users table created or verified successfully");
  } catch (error) {
    log.error(`Error creating users table: ${error.message}`);
  }
}

// Save user to database
async function saveUser(userData) {
  try {
    if (!dbPool) {
      log.warn("Database not available, skipping user save");
      return false;
    }

    const insertQuery = `
      INSERT INTO users (discord_id, discord_username, first_name, last_name, email, project_name, invoice_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        discord_username = VALUES(discord_username),
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        email = VALUES(email),
        project_name = VALUES(project_name),
        invoice_number = VALUES(invoice_number),
        updated_at = CURRENT_TIMESTAMP
    `;

    const [result] = await dbPool.execute(insertQuery, [
      userData.discordId,
      userData.discordUsername,
      userData.firstName,
      userData.lastName,
      userData.email,
      userData.projectName,
      userData.invoiceNumber,
    ]);

    log.info(`User ${userData.discordUsername} saved to database successfully`);

    // Update the users embed in the users channel (don't let this fail the save)
    try {
      await updateUsersEmbed();
    } catch (embedError) {
      log.error(`Error updating users embed after save: ${embedError.message}`);
    }

    return true;
  } catch (error) {
    log.error(`Error saving user to database: ${error.message}`);
    return false;
  }
}

// Fetch all users from database
async function fetchAllUsers() {
  try {
    if (!dbPool) {
      log.warn("Database not available, cannot fetch users");
      return [];
    }

    const [rows] = await dbPool.execute(
      "SELECT * FROM users ORDER BY created_at DESC"
    );
    return rows;
  } catch (error) {
    log.error(`Error fetching users from database: ${error.message}`);
    return [];
  }
}

// Generate users embed
async function generateUsersEmbed() {
  const users = await fetchAllUsers();

  const embed = new EmbedBuilder()
    .setTitle("📊 Registered Users Database")
    .setColor(0x00ae86)
    .setTimestamp()
    .setFooter({ text: `Total Users: ${users.length}` });

  if (users.length === 0) {
    embed.setDescription("No users registered yet.");
    return embed;
  }

  // Discord embed field limit is 25 fields, and each field has a 1024 character limit
  // We'll show up to 20 users to leave room for pagination info
  const maxUsersPerEmbed = 20;
  const displayUsers = users.slice(0, maxUsersPerEmbed);

  let description = "";

  for (let i = 0; i < displayUsers.length; i++) {
    const user = displayUsers[i];
    const userInfo =
      `**${i + 1}.** ${user.first_name} ${user.last_name}\n` +
      `📧 ${user.email}\n` +
      `🏷️ ${user.project_name || "Searching"}\n` +
      `📄 Invoice: ${user.invoice_number}\n` +
      `🆔 Discord: ${user.discord_username}\n` +
      `📅 Joined: ${new Date(user.created_at).toLocaleDateString()}\n\n`;

    // Check if adding this user would exceed Discord's 4096 character limit
    if (description.length + userInfo.length > 4000) {
      description += `\n*... and ${users.length - i} more users*`;
      break;
    }

    description += userInfo;
  }

  if (users.length > maxUsersPerEmbed) {
    description += `\n📄 Showing ${displayUsers.length} of ${users.length} total users`;
  }

  embed.setDescription(description);
  return embed;
}

// Send or update users embed in the users channel
async function updateUsersEmbed() {
  try {
    const usersChannel = await client.channels.fetch(USERS_CHANNEL_ID);
    if (!usersChannel) {
      log.error(`Could not find users channel with ID: ${USERS_CHANNEL_ID}`);
      return;
    }

    const embed = await generateUsersEmbed();

    if (usersEmbedMessageId) {
      // Try to edit existing message
      try {
        const existingMessage = await usersChannel.messages.fetch(
          usersEmbedMessageId
        );
        await existingMessage.edit({ embeds: [embed] });
        log.info("Users embed updated successfully");
        return;
      } catch (error) {
        log.warn(`Could not edit existing users embed: ${error.message}`);
        usersEmbedMessageId = null; // Reset so we create a new one
      }
    }

    // Send new message
    const message = await usersChannel.send({ embeds: [embed] });
    usersEmbedMessageId = message.id;
    log.info("New users embed sent successfully");
  } catch (error) {
    log.error(`Error updating users embed: ${error.message}`);
  }
}

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

  // Initialize database connection
  await initDatabase();

  // Set bot activity status
  client.user.setActivity("for new members", {
    type: "WATCHING",
  });

  // Send join message to the specified channel
  try {
    const joinChannel = await client.channels.fetch(JOIN_CHANNEL_ID);
    if (joinChannel) {
      await sendJoinMessage(joinChannel);
      log.info(`✅ Join message sent to channel #${joinChannel.name}`);
    } else {
      log.error(`❌ Could not find channel with ID: ${JOIN_CHANNEL_ID}`);
    }
  } catch (error) {
    log.error(`❌ Error sending join message: ${error.message}`);
  }

  // Initialize users embed in users channel
  await updateUsersEmbed();
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
            flags: 64, // EPHEMERAL flag
          });
      }
    } else if (interaction.isButton()) {
      // Handle button interactions
      if (interaction.customId === "join_button") {
        await handleJoinButton(interaction);
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
      flags: 64, // EPHEMERAL flag
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

// Function to send join message to a channel
async function sendJoinMessage(channel) {
  // Create the embed
  const embed = new EmbedBuilder()
    .setTitle("🚀 Join Our Community!")
    .setDescription(
      "Welcome! To join our community, you'll need to fill out a registration form with the following information:"
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
      {
        name: "Email Address",
        value: "Your email address",
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

  const emailInput = new TextInputBuilder()
    .setCustomId("email")
    .setLabel("Email Address")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder("your.email@example.com");

  // Create action rows for each input
  const firstRow = new ActionRowBuilder().addComponents(firstNameInput);
  const secondRow = new ActionRowBuilder().addComponents(lastNameInput);
  const thirdRow = new ActionRowBuilder().addComponents(emailInput);
  const fourthRow = new ActionRowBuilder().addComponents(projectNameInput);
  const fifthRow = new ActionRowBuilder().addComponents(invoiceInput);

  modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

  await interaction.showModal(modal);
}

async function handleJoinModal(interaction) {
  await interaction.deferReply({ flags: 64 }); // 64 = EPHEMERAL flag

  const firstName = interaction.fields.getTextInputValue("first_name");
  const lastName = interaction.fields.getTextInputValue("last_name");
  const email = interaction.fields.getTextInputValue("email");
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

    // 2. Validate invoice and assign language-specific member role
    const isInvoiceValid = await mockApiCall(invoiceNumber);
    let memberRoleName; // Initialize outside to use in confirmation message

    if (isInvoiceValid) {
      const unverifiedRole = guild.roles.cache.get(ROLES.UNVERIFIED);

      // Determine which language role the user has and assign appropriate member role
      let memberRole;

      if (member.roles.cache.has(ROLES.ENGLISH)) {
        memberRole = guild.roles.cache.get(ROLES.ENGLISH_MEMBER);
        memberRoleName = "English Member";
      } else if (member.roles.cache.has(ROLES.BOSNIAN_CROATIAN_SERBIAN)) {
        memberRole = guild.roles.cache.get(
          ROLES.BOSNIAN_CROATIAN_SERBIAN_MEMBER
        );
        memberRoleName = "Bosnian/Croatian/Serbian Member";
      } else {
        // Fallback to legacy member role if no language role found
        memberRole = guild.roles.cache.get(ROLES.MEMBER);
        memberRoleName = "Member (No language role detected)";
        log.warn(
          `User ${interaction.user.tag} has no language role, using legacy member role`
        );

        // If legacy member role doesn't exist, log available roles for debugging
        if (!memberRole) {
          const availableRoles = guild.roles.cache
            .map((role) => `${role.name} (${role.id})`)
            .join(", ");
          log.error(
            `Legacy member role not found! Available roles: ${availableRoles}`
          );
        }
      }

      if (memberRole) {
        // Remove unverified role if user has it
        if (unverifiedRole && member.roles.cache.has(ROLES.UNVERIFIED)) {
          await member.roles.remove(unverifiedRole);
          log.info(`Removed unverified role from ${interaction.user.tag}`);
        }

        // Add appropriate member role
        await member.roles.add(memberRole);
        log.info(`Assigned ${memberRoleName} role to ${interaction.user.tag}`);
      } else {
        log.error(`Could not find member role for ${interaction.user.tag}`);
      }
    }

    // 4. Save user to database
    if (isInvoiceValid) {
      const userData = {
        discordId: interaction.user.id,
        discordUsername: interaction.user.tag,
        firstName,
        lastName,
        email,
        projectName,
        invoiceNumber,
      };

      const savedToDb = await saveUser(userData);
      if (savedToDb) {
        log.info(`User ${interaction.user.tag} saved to database successfully`);
      } else {
        log.warn(`Failed to save user ${interaction.user.tag} to database`);
      }
    }

    // 5. Send confirmation message
    let memberStatusText = "❌ Invoice validation failed";
    if (isInvoiceValid) {
      memberStatusText = memberRoleName
        ? `✅ Verified - ${memberRoleName}`
        : "✅ Verified";
    }

    const confirmEmbed = new EmbedBuilder()
      .setTitle("✅ Registration Successful!")
      .setDescription(
        "Welcome to our community! Your registration has been processed."
      )
      .addFields(
        { name: "Nickname", value: newNickname, inline: true },
        {
          name: "Member Status",
          value: memberStatusText,
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
