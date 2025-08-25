# 🤖 Seolaxy Discord Bot

A professional Discord bot built with Node.js and discord.js v14, featuring slash commands and proper production deployment configuration.

## 📋 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Discord Developer Portal Setup](#-discord-developer-portal-setup)
- [Local Development](#-local-development)
- [Commands](#-commands)
- [VPS Deployment](#-vps-deployment)
- [Monitoring & Logs](#-monitoring--logs)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

## ✨ Features

- **Slash Commands**: Modern Discord slash command support
- **Environment Configuration**: Secure token and configuration management
- **Professional Structure**: Well-organized codebase following best practices
- **Error Handling**: Comprehensive error handling and logging
- **Production Ready**: PM2 configuration for VPS deployment
- **Auto-restart**: Automatic restart on crashes
- **Logging**: Structured logging with different levels

## 📋 Prerequisites

- **Node.js**: Version 16.9.0 or higher
- **npm**: Latest version
- **Discord Account**: For creating the bot application
- **VPS**: Ubuntu/Debian server for production deployment (optional)

## 📁 Project Structure

```
seolaxy-discord-bot/
├── src/
│   └── index.js              # Main bot file
├── scripts/
│   └── deploy-commands.js    # Command deployment script
├── docs/
│   ├── DISCORD_SETUP.md      # Discord Developer Portal guide
│   └── VPS_DEPLOYMENT.md     # VPS deployment guide
├── logs/                     # PM2 logs directory (created automatically)
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── ecosystem.config.js      # PM2 configuration
├── package.json             # Project dependencies and scripts
└── README.md               # This file
```

## 🚀 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/seolaxy-discord-bot.git
   cd seolaxy-discord-bot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and fill in your Discord bot credentials (see [Configuration](#-configuration)).

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here

# Environment
NODE_ENV=development
LOG_LEVEL=info
```

### Environment Variables Explained

- **DISCORD_TOKEN**: Your bot's token from Discord Developer Portal
- **CLIENT_ID**: Your application's client ID (also called Application ID)
- **GUILD_ID**: Your Discord server's ID where you want to test the bot
- **NODE_ENV**: Environment mode (`development` or `production`)
- **LOG_LEVEL**: Logging level (`error`, `warn`, `info`, `debug`)

## 🎯 Discord Developer Portal Setup

### Step 1: Create a New Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Enter your bot name (e.g., "Seolaxy Bot")
4. Click **"Create"**

### Step 2: Create a Bot

1. In your application, go to the **"Bot"** section
2. Click **"Add Bot"**
3. Customize your bot:
   - **Username**: Your bot's display name
   - **Icon**: Upload a profile picture
   - **Public Bot**: Uncheck if you want only you to invite the bot

### Step 3: Get Your Bot Token

1. In the **"Bot"** section, find **"Token"**
2. Click **"Reset Token"** and **"Yes, do it!"**
3. Click **"Copy"** and save this token securely
4. Add this token to your `.env` file as `DISCORD_TOKEN`

### Step 4: Get Your Application ID

1. Go to the **"General Information"** section
2. Copy the **"Application ID"**
3. Add this to your `.env` file as `CLIENT_ID`

### Step 5: Get Your Guild ID

1. Open Discord and go to your server
2. Right-click on your server name
3. Click **"Copy Server ID"** (enable Developer Mode in Discord settings if not visible)
4. Add this to your `.env` file as `GUILD_ID`

### Step 6: Set Bot Permissions

1. Go to the **"Bot"** section
2. Under **"Privileged Gateway Intents"**, you can leave all unchecked for this basic bot
3. Scroll down to **"Bot Permissions"** and select:
   - **Send Messages**
   - **Use Slash Commands**
   - **View Channels**

### Step 7: Generate Invite Link

1. Go to the **"OAuth2 > URL Generator"** section
2. Select **Scopes**: `bot` and `applications.commands`
3. Select **Permissions**: Same as Step 6
4. Copy the generated URL and open it to invite your bot to your server

## 💻 Local Development

1. **Deploy commands**:
   ```bash
   npm run deploy
   ```

2. **Start the bot in development mode**:
   ```bash
   npm run dev
   ```

3. **Start the bot in production mode**:
   ```bash
   npm start
   ```

### Available Scripts

- `npm start` - Start the bot in production mode
- `npm run dev` - Start the bot with auto-restart on file changes
- `npm run deploy` - Deploy slash commands to Discord
- `npm run lint` - Check code style
- `npm run lint:fix` - Fix code style issues automatically

## 🎮 Commands

### `/hello`
- **Description**: Replies with "Hello world!"
- **Usage**: Type `/hello` in any channel where the bot has access
- **Response**: "👋 Hello world! Nice to meet you, [YourName]!"

## 🌐 VPS Deployment

### Prerequisites on VPS

1. **Update system**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install PM2 globally**:
   ```bash
   sudo npm install -g pm2
   ```

4. **Install Git**:
   ```bash
   sudo apt install git -y
   ```

### Deployment Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/seolaxy-discord-bot.git
   cd seolaxy-discord-bot
   ```

2. **Install dependencies**:
   ```bash
   npm install --production
   ```

3. **Set up environment**:
   ```bash
   cp env.example .env
   nano .env  # Edit with your actual values
   ```

4. **Create logs directory**:
   ```bash
   mkdir logs
   ```

5. **Deploy commands**:
   ```bash
   npm run deploy
   ```

6. **Start with PM2**:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

7. **Save PM2 configuration**:
   ```bash
   pm2 save
   pm2 startup
   ```

8. **Check status**:
   ```bash
   pm2 status
   pm2 logs seolaxy-discord-bot
   ```

### PM2 Management Commands

```bash
# View bot status
pm2 status

# View real-time logs
pm2 logs seolaxy-discord-bot

# Restart the bot
pm2 restart seolaxy-discord-bot

# Stop the bot
pm2 stop seolaxy-discord-bot

# Delete the bot from PM2
pm2 delete seolaxy-discord-bot

# Monitor resource usage
pm2 monit
```

## 📊 Monitoring & Logs

### Log Files (when using PM2)

- **Error logs**: `./logs/pm2-error.log`
- **Output logs**: `./logs/pm2-out.log`
- **Combined logs**: `./logs/pm2-combined.log`

### Log Levels

- **error**: Only error messages
- **warn**: Warnings and errors
- **info**: General information, warnings, and errors
- **debug**: All messages including debug information

## 🔧 Troubleshooting

### Common Issues

1. **Bot doesn't respond to commands**:
   - Ensure commands are deployed: `npm run deploy`
   - Check bot permissions in Discord server
   - Verify bot is online (green status)

2. **"Missing Access" error**:
   - Check bot permissions in the channel
   - Ensure bot has "Use Slash Commands" permission

3. **Environment variable errors**:
   - Verify `.env` file exists and has correct values
   - Check for extra spaces or quotes in `.env` values
   - Ensure all required variables are set

4. **PM2 issues**:
   - Check PM2 status: `pm2 status`
   - View logs: `pm2 logs seolaxy-discord-bot`
   - Restart: `pm2 restart seolaxy-discord-bot`

### Debug Mode

Enable debug logging by setting `LOG_LEVEL=debug` in your `.env` file.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting: `npm run lint:fix`
5. Test your changes
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you need help:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/yourusername/seolaxy-discord-bot/issues)
3. Create a new issue with detailed information

---

**Happy botting! 🎉**
