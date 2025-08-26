const { REST, Routes } = require("discord.js");
require("dotenv").config();

// Array of slash commands to register
const commands = [
  {
    name: "hello",
    description: "Replies with Hello World!",
  },
  // Add more commands here in the future
];

// Deploy commands function
async function deployCommands() {
  try {
    console.log("🚀 Started refreshing application (/) commands.");

    // Create REST instance
    const rest = new REST({ version: "10" }).setToken(
      process.env.DISCORD_TOKEN
    );

    // Check if required environment variables exist
    if (!process.env.DISCORD_TOKEN) {
      throw new Error("Missing DISCORD_TOKEN in environment variables");
    }
    if (!process.env.CLIENT_ID) {
      throw new Error("Missing CLIENT_ID in environment variables");
    }
    if (!process.env.GUILD_ID) {
      throw new Error("Missing GUILD_ID in environment variables");
    }

    // Register commands for specific guild (faster for development)
    const data = await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log(
      `✅ Successfully reloaded ${data.length} application (/) commands.`
    );
    console.log("Commands registered:");
    data.forEach((command) => {
      console.log(`  • /${command.name} - ${command.description}`);
    });
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
    // Only exit if this script is run directly, not when imported
    if (require.main === module) {
      process.exit(1);
    }
    throw error; // Re-throw the error so calling code can handle it
  }
}

// For global commands (uncomment if you want global commands instead of guild-specific)
/*
async function deployGlobalCommands() {
    try {
        console.log('🚀 Started refreshing global application (/) commands.');

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ Successfully reloaded ${data.length} global application (/) commands.`);
        console.log('⚠️ Note: Global commands may take up to 1 hour to appear in all servers.');

    } catch (error) {
        console.error('❌ Error deploying global commands:', error);
        process.exit(1);
    }
}
*/

// Run the deployment
if (require.main === module) {
  deployCommands();
}

module.exports = { deployCommands, commands };
