# 🤖 Seolaxy Discord Bot

A professional, enterprise-grade Discord bot built with Node.js and discord.js v14, featuring user registration, payment validation, database integration, and comprehensive user management capabilities.

## 📋 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Discord Developer Portal Setup](#-discord-developer-portal-setup)
- [Local Development](#-local-development)
- [Commands](#-commands)
- [Architecture](#-architecture)
- [VPS Deployment](#-vps-deployment)
- [Monitoring & Logs](#-monitoring--logs)
- [API Integration](#-api-integration)
- [Database Schema](#-database-schema)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

## ✨ Features

### 🔐 **Authentication & Registration**
- **User Registration System**: Complete modal-based registration flow
- **Payment Validation**: Real-time validation using Seolaxy API
- **Fraud Prevention**: Duplicate payment intent detection and blocking
- **Role Management**: Automatic role assignment based on language preferences
- **Nickname Management**: Auto-formatting user nicknames with project info

### 📊 **Database Integration**
- **MySQL Database**: Full user data persistence with UTF-8 support
- **User Management**: Complete CRUD operations for user data
- **Data Export**: CSV export functionality for user analytics
- **Pagination**: Efficient handling of large user datasets
- **Security Checks**: Duplicate payment intent validation and fraud prevention

### 🎨 **User Interface**
- **Interactive Embeds**: Professional, branded Discord embeds
- **Pagination Controls**: Navigate through user lists with arrow buttons
- **Export Controls**: One-click CSV export for administrators
- **Real-time Updates**: Live updates when new users register

### 🛡️ **Security & Reliability**
- **Environment Configuration**: Secure token and configuration management
- **Error Handling**: Comprehensive error handling and logging
- **Input Validation**: Sanitized user inputs and SQL injection protection
- **Rate Limiting**: Built-in Discord rate limit handling
- **🚨 Fraud Prevention**: Duplicate payment intent detection and blocking
- **Security Logging**: Comprehensive logging of security events and threats

### 🚀 **Production Ready**
- **Modular Architecture**: Clean, maintainable, and scalable codebase
- **PM2 Integration**: Process management for VPS deployment
- **Auto-restart**: Automatic restart on crashes
- **Structured Logging**: Multi-level logging with timestamps

## 📋 Prerequisites

- **Node.js**: Version 16.9.0 or higher
- **npm**: Latest version
- **MySQL**: Database server (PebbleHost or local)
- **Discord Account**: For creating the bot application
- **VPS**: Ubuntu/Debian server for production deployment (optional)

## 📁 Project Structure

```
seolaxy-discord-bot/
├── src/
│   ├── index.js                  # Main bot entry point
│   ├── config/                   # Configuration modules
│   │   ├── database.js           # Database configuration
│   │   ├── discord.js            # Discord client configuration
│   │   └── api.js                # Seolaxy API configuration
│   ├── constants/                # Application constants
│   │   ├── roles.js              # Discord role IDs
│   │   └── channels.js           # Discord channel IDs
│   ├── services/                 # Business logic services
│   │   ├── database.js           # Database operations
│   │   ├── seolaxyApi.js         # API integration
│   │   ├── userService.js        # User management
│   │   └── csvExport.js          # CSV export functionality
│   ├── handlers/                 # Discord event handlers
│   │   ├── commands.js           # Slash command handlers
│   │   ├── buttons.js            # Button interaction handlers
│   │   └── modals.js             # Modal submission handlers
│   ├── components/               # UI components
│   │   ├── embeds.js             # Discord embed templates
│   │   ├── buttons.js            # Button component builders
│   │   └── modals.js             # Modal form builders
│   ├── utils/                    # Utility functions
│   │   ├── logger.js             # Centralized logging
│   │   └── validation.js         # Input validation
│   └── images/                   # Static assets
│       ├── logo-mobile.svg
│       └── welcome-back.png
├── scripts/
│   ├── deploy-commands.js        # Command deployment script
│   └── setup.js                 # Initial setup script
├── docs/
│   ├── DISCORD_SETUP.md          # Discord Developer Portal guide
│   └── VPS_DEPLOYMENT.md         # VPS deployment guide
├── logs/                         # PM2 logs directory (auto-created)
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── .eslintrc.js                  # ESLint configuration
├── ecosystem.config.js           # PM2 configuration
├── package.json                  # Project dependencies
├── LICENSE                       # MIT License
├── CONTRIBUTING.md               # Contribution guidelines
└── README.md                     # This file
```

## 🚀 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/seolaxy/discord-bot.git
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
   
   Edit `.env` and fill in your credentials (see [Configuration](#-configuration)).

4. **Run initial setup** (optional):
   ```bash
   npm run setup
   ```

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
ENGLISH_SERVER_ID=your_english_server_id_here

# Environment
NODE_ENV=development
LOG_LEVEL=info

# Database Configuration
DB_HOST=uk03-sql.pebblehost.com
DB_PORT=3306
DB_NAME=customer_1110818_users
DB_USER=customer_1110818_users
DB_PASSWORD=your_database_password_here

# Seolaxy API Configuration
SEOLAXY_API_BASE_URL=https://dev.mentorship.seolaxy.com/api/open-api
SEOLAXY_API_BEARER_TOKEN=your_seolaxy_api_bearer_token_here
```

### Environment Variables Explained

- **DISCORD_TOKEN**: Your bot's token from Discord Developer Portal
- **CLIENT_ID**: Your application's client ID (also called Application ID)  
- **GUILD_ID**: Your Discord server's ID where you want to test the bot (main server)
- **ENGLISH_SERVER_ID**: Your English Discord server's ID for verified English users
- **NODE_ENV**: Environment mode (`development` or `production`)
- **LOG_LEVEL**: Logging level (`error`, `warn`, `info`, `debug`)
- **DB_***: Database connection credentials for your MySQL server
- **SEOLAXY_API_***: Seolaxy API configuration for payment validation

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

### Step 4: Set Bot Permissions

Required permissions for the bot:
- **Send Messages**
- **Use Slash Commands**
- **Manage Nicknames**
- **Manage Roles**
- **Read Message History**
- **Attach Files**

### Step 5: Invite Bot to Server

1. Go to **"OAuth2"** → **"URL Generator"**
2. Select **"bot"** and **"applications.commands"** scopes
3. Select the required permissions
4. Copy the generated URL and open it in your browser
5. Select your server and authorize the bot

## 💻 Local Development

```bash
# Start in development mode with auto-reload
npm run dev

# Start in production mode
npm start

# Deploy commands to Discord
npm run deploy

# Run setup wizard
npm run setup

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 🎮 Commands

### Slash Commands

- **/hello** - Test command that greets the user

### Interactive Features

- **Join Button** - Opens registration modal
- **User Pagination** - Navigate through registered users
- **CSV Export** - Download complete user database
- **Real-time Updates** - Automatic embed updates

## 🏗️ Architecture

### Design Principles

The bot follows a **modular, service-oriented architecture** with clear separation of concerns:

- **Configuration Layer**: Centralized environment and API configuration
- **Service Layer**: Business logic for database, API, and user operations
- **Handler Layer**: Discord event processing and interaction management
- **Component Layer**: Reusable UI components for embeds, buttons, and modals
- **Utility Layer**: Shared functionality like logging and validation

### Key Components

1. **Database Service** (`src/services/database.js`)
   - Connection pooling and management
   - User CRUD operations
   - Schema management and migrations
   - Duplicate payment intent detection

2. **API Service** (`src/services/seolaxyApi.js`)
   - Payment intent validation
   - Error handling and retry logic
   - Secure authentication

3. **User Service** (`src/services/userService.js`)
   - Registration workflow orchestration
   - Role assignment logic
   - Nickname management

4. **Event Handlers** (`src/handlers/`)
   - Command processing
   - Button interactions
   - Modal submissions

### Data Flow

```
User Interaction → Handler → API Validation → Security Check → Service → Database → Response
```

### Security Workflow

```
Registration Request → Payment Intent Validation → Duplicate Check → User Processing → Database Save
```

If any step fails, the registration is blocked and the user receives appropriate feedback.

## 📊 Database Schema

### Users Table

```sql
CREATE TABLE users (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 🔌 API Integration

### Seolaxy Payment Validation API

**Endpoint**: `GET /payment-intent/validate`

**Parameters**:
- `payment_intent_id`: The payment intent ID to validate

**Response**:
```json
{
  "isValid": true | false,
  "error": "invalid_token" // Only if authentication fails
}
```

**Authentication**: Bearer token in Authorization header

### Security Features

#### 🛡️ Duplicate Payment Intent Prevention

The bot implements a comprehensive fraud prevention system:

1. **API Validation**: Validates payment intent with Seolaxy API
2. **Database Check**: Verifies payment intent hasn't been used before
3. **Registration Blocking**: Prevents duplicate registrations
4. **Security Logging**: Logs all fraud attempts for analysis

**Security Flow**:
```
Payment Intent → API Validation → Database Duplicate Check → Registration Processing
```

**Fraud Detection Response**:
```
❌ Security Alert: This payment intent has already been used for registration. 
Each payment intent can only be used once. If you believe this is an error, 
please contact an administrator.
```

## 🌐 VPS Deployment

### Quick Deploy

```bash
# On your VPS
git clone https://github.com/seolaxy/discord-bot.git
cd seolaxy-discord-bot
npm install --production
cp env.example .env
# Edit .env with your production values
npm run deploy
pm2 start ecosystem.config.js --env production
```

### PM2 Configuration

The included `ecosystem.config.js` provides:
- **Auto-restart** on crashes
- **Memory monitoring** with restart at 1GB
- **Log management** with timestamps
- **Zero-downtime** deployments
- **Environment** separation

### PM2 Commands

```bash
# Start the bot
pm2 start ecosystem.config.js

# View logs
pm2 logs seolaxy-discord-bot

# Restart bot
pm2 restart seolaxy-discord-bot

# Stop bot
pm2 stop seolaxy-discord-bot

# View status
pm2 status
```

## 📊 Monitoring & Logs

### Log Levels

- **ERROR**: Critical errors that need immediate attention
- **WARN**: Warning conditions that should be monitored
- **INFO**: General information about bot operations
- **DEBUG**: Detailed debugging information (development only)

### Log Locations

- **Console**: Real-time logging output
- **PM2 Logs**: `./logs/pm2-*.log` (in production)
- **Application Logs**: Structured logging with timestamps

### Monitoring

Monitor these key metrics:
- **Registration Success Rate**: API validation success percentage
- **Security Events**: Fraud attempts and duplicate payment intents
- **Database Performance**: Query execution times
- **Discord API Rate Limits**: Request/response times
- **Memory Usage**: Bot memory consumption
- **Error Rates**: Application error frequency

## 🐛 Troubleshooting

### Common Issues

**Bot not responding to commands:**
- Verify `DISCORD_TOKEN` is correct
- Check bot permissions in Discord server
- Ensure commands are deployed (`npm run deploy`)

**Database connection failed:**
- Verify database credentials in `.env`
- Check database server accessibility
- Confirm MySQL server is running

**API validation failing:**
- Check `SEOLAXY_API_BEARER_TOKEN` is valid
- Verify API endpoint URL
- Review API rate limits

**Duplicate payment intent error:**
- This is a security feature working correctly
- Each payment intent can only be used once
- Check database for existing registrations with same payment intent
- Contact administrator if legitimate user needs to re-register

**Role assignment not working:**
- Update role IDs in `src/constants/roles.js`
- Verify bot has "Manage Roles" permission
- Check role hierarchy (bot role must be higher)

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
```

This provides detailed information about:
- Database queries and responses
- API requests and responses
- Discord interaction processing
- Internal state changes

## 👥 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style

- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for functions
- Maintain consistent file structure

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` directory
- **Issues**: Open an issue on GitHub
- **Discord**: Join our community server
- **Email**: Contact the development team

---

**Made with ❤️ by the Seolaxy Team**