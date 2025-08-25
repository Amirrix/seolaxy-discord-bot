# 🎯 Discord Developer Portal Setup Guide

This guide walks you through setting up your Discord bot application in the Discord Developer Portal.

## Prerequisites

- A Discord account
- Access to a Discord server where you can add bots (you need "Manage Server" permission)

## Step-by-Step Setup

### 1. Access Discord Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Log in with your Discord account

### 2. Create New Application

1. Click the **"New Application"** button (top right)
2. Enter your application name (e.g., "Seolaxy Bot")
3. Agree to the Developer Terms of Service
4. Click **"Create"**

### 3. Configure General Information

1. You'll be on the **"General Information"** tab
2. **Copy the Application ID** - you'll need this for your `.env` file as `CLIENT_ID`
3. Optionally customize:
   - **Description**: What your bot does
   - **Icon**: Upload a bot avatar
   - **Tags**: Add relevant tags

### 4. Create the Bot

1. Navigate to the **"Bot"** section in the left sidebar
2. Click **"Add Bot"**
3. Confirm by clicking **"Yes, do it!"**

### 5. Configure Bot Settings

1. **Bot Token**:
   - Click **"Reset Token"**
   - Click **"Yes, do it!"** to confirm
   - Click **"Copy"** to copy your bot token
   - **⚠️ IMPORTANT**: Save this token securely - you'll need it for your `.env` file as `DISCORD_TOKEN`
   - **Never share this token publicly!**

2. **Bot Username**:
   - Change the username if desired
   - This is how your bot will appear in Discord

3. **Bot Avatar**:
   - Upload an image for your bot's profile picture

4. **Public Bot**:
   - **Uncheck** "Public Bot" if you want only you to be able to invite the bot
   - **Check** if you want others to invite your bot to their servers

5. **Privileged Gateway Intents**:
   - For this basic bot, you can leave all intents unchecked
   - Only enable if your bot needs specific permissions

### 6. Set Bot Permissions

1. Scroll down to **"Bot Permissions"**
2. Select the following permissions:
   - ✅ **View Channels**
   - ✅ **Send Messages**
   - ✅ **Use Slash Commands**
   - ✅ **Read Message History** (optional, for better functionality)
   - ✅ **Add Reactions** (optional, for interactive features)

### 7. Generate Bot Invite Link

1. Go to **"OAuth2"** → **"URL Generator"** in the left sidebar
2. Under **"Scopes"**, select:
   - ✅ **bot**
   - ✅ **applications.commands**
3. Under **"Bot Permissions"**, select the same permissions as Step 6
4. Copy the generated URL at the bottom

### 8. Invite Bot to Your Server

1. Open the copied URL in a new browser tab
2. Select your Discord server from the dropdown
3. Click **"Continue"**
4. Review the permissions and click **"Authorize"**
5. Complete any CAPTCHA if prompted

### 9. Get Your Server (Guild) ID

1. Open Discord and go to your server
2. Enable Developer Mode:
   - Go to **User Settings** (gear icon)
   - Navigate to **Advanced** under "App Settings"
   - Toggle **Developer Mode** ON
3. Right-click on your server name in the server list
4. Click **"Copy Server ID"**
5. Save this ID - you'll need it for your `.env` file as `GUILD_ID`

## Environment Variables Summary

After completing this setup, you should have these values for your `.env` file:

```env
DISCORD_TOKEN=your_bot_token_from_step_5
CLIENT_ID=your_application_id_from_step_3
GUILD_ID=your_server_id_from_step_9
```

## Verification

To verify your setup:

1. Check that your bot appears in your Discord server's member list
2. The bot should show as offline (gray status) until you start your application
3. You should see the bot has the permissions you granted

## Troubleshooting

### Bot doesn't appear in server
- Make sure you completed the invite process in Step 8
- Check that you selected the correct server
- Verify you have "Manage Server" permission

### Can't copy Application ID
- Make sure you're on the "General Information" tab
- The Application ID is also called "Client ID"

### Bot token issues
- Never share your bot token
- If compromised, regenerate it in the Bot section
- Update your `.env` file with the new token

### Permission errors
- Ensure your bot has the necessary permissions in your server
- Check channel-specific permissions
- Verify the bot role is positioned correctly in your server's role hierarchy

## Security Best Practices

1. **Never commit your bot token to version control**
2. **Use environment variables for sensitive data**
3. **Only grant necessary permissions**
4. **Regularly rotate your bot token if needed**
5. **Monitor your bot's activity**

## Next Steps

After completing this setup:

1. Update your `.env` file with the obtained values
2. Deploy your slash commands: `npm run deploy`
3. Start your bot: `npm start`
4. Test the `/hello` command in your Discord server

---

**Need help?** Check the [main README troubleshooting section](../README.md#-troubleshooting) or create an issue on GitHub.
