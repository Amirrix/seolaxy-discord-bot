# 🌐 VPS Deployment Guide

This guide covers deploying your Discord bot to a VPS (Virtual Private Server) running Ubuntu/Debian with PM2 for 24/7 operation.

## Prerequisites

- A VPS running Ubuntu 18.04+ or Debian 9+
- SSH access to your VPS
- Root or sudo privileges
- Your bot tested and working locally

## VPS Setup

### 1. Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git build-essential

# Create a non-root user (if you don't have one)
sudo adduser botuser
sudo usermod -aG sudo botuser

# Switch to the new user
su - botuser
```

### 2. Install Node.js

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### 3. Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 4. Configure Firewall (Optional but Recommended)

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow ssh

# Allow HTTP and HTTPS (if you plan to add a web interface later)
sudo ufw allow 80
sudo ufw allow 443

# Check firewall status
sudo ufw status
```

## Bot Deployment

### 1. Clone Your Repository

```bash
# Navigate to web directory
cd /var/www

# Clone your bot repository
sudo git clone https://github.com/yourusername/seolaxy-discord-bot.git
cd seolaxy-discord-bot

# Change ownership to your user
sudo chown -R $USER:$USER /var/www/seolaxy-discord-bot

# Make sure you're in the right directory
pwd  # Should show /var/www/seolaxy-discord-bot
```

### 2. Install Dependencies

```bash
# Install production dependencies only
npm install --production

# Verify installation
npm list --depth=0
```

### 3. Environment Configuration

```bash
# Copy environment template
cp env.example .env

# Edit environment file
nano .env
```

Add your production values:
```env
DISCORD_TOKEN=your_actual_bot_token
CLIENT_ID=your_actual_client_id
GUILD_ID=your_actual_guild_id
NODE_ENV=production
LOG_LEVEL=info
```

### 4. Create Logs Directory

```bash
# Create logs directory for PM2
mkdir -p logs

# Set proper permissions
chmod 755 logs
```

### 5. Deploy Commands

```bash
# Deploy slash commands to Discord
npm run deploy
```

You should see:
```
🚀 Started refreshing application (/) commands.
✅ Successfully reloaded 1 application (/) commands.
Commands registered:
  • /hello - Replies with Hello World!
```

### 6. Start with PM2

```bash
# Start the bot using PM2 ecosystem file
pm2 start ecosystem.config.js --env production

# Check status
pm2 status
```

Expected output:
```
┌─────┬──────────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name                     │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼──────────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ seolaxy-discord-bot      │ default     │ 1.0.0   │ fork    │ 12345    │ 0s     │ 0    │ online    │ 0%       │ 50.0mb   │ botuser  │ disabled │
└─────┴──────────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

### 7. Configure PM2 Startup

```bash
# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions shown (usually run a command with sudo)
# Example: sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u botuser --hp /home/botuser
```

### 8. Test Your Bot

1. Go to your Discord server
2. Type `/hello` in any channel
3. Your bot should respond with "👋 Hello world! Nice to meet you, [YourName]!"

## PM2 Management

### Basic Commands

```bash
# View bot status
pm2 status

# View real-time logs
pm2 logs seolaxy-discord-bot

# View logs for last 100 lines
pm2 logs seolaxy-discord-bot --lines 100

# Restart the bot
pm2 restart seolaxy-discord-bot

# Stop the bot
pm2 stop seolaxy-discord-bot

# Start the bot (if stopped)
pm2 start seolaxy-discord-bot

# Delete bot from PM2 (removes from process list)
pm2 delete seolaxy-discord-bot

# Reload bot (zero-downtime restart)
pm2 reload seolaxy-discord-bot
```

### Monitoring

```bash
# Real-time monitoring dashboard
pm2 monit

# Show detailed information
pm2 show seolaxy-discord-bot

# Display memory usage
pm2 list
```

### Log Management

```bash
# Clear all logs
pm2 flush

# Rotate logs (create new log files)
pm2 reloadLogs

# View error logs only
tail -f logs/pm2-error.log

# View output logs only
tail -f logs/pm2-out.log
```

## Updating Your Bot

### 1. Update Code

```bash
# Navigate to bot directory
cd /var/www/seolaxy-discord-bot

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install --production

# Deploy new commands (if any)
npm run deploy

# Restart with PM2
pm2 restart seolaxy-discord-bot
```

### 2. Automated Updates (Optional)

Create an update script:

```bash
# Create update script
nano update-bot.sh
```

Add this content:
```bash
#!/bin/bash
cd /var/www/seolaxy-discord-bot
git pull origin main
npm install --production
npm run deploy
pm2 restart seolaxy-discord-bot
echo "Bot updated successfully!"
```

Make it executable:
```bash
chmod +x update-bot.sh
```

## Security Best Practices

### 1. SSH Key Authentication

```bash
# Generate SSH key (on your local machine)
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Copy public key to VPS
ssh-copy-id botuser@your-vps-ip
```

### 2. Disable Password Authentication

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Change these settings:
# PasswordAuthentication no
# PermitRootLogin no

# Restart SSH service
sudo systemctl restart ssh
```

### 3. Regular Updates

```bash
# Set up automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

## Troubleshooting

### Bot Not Starting

```bash
# Check PM2 logs
pm2 logs seolaxy-discord-bot

# Check if all environment variables are set
cat .env

# Verify Node.js version
node --version

# Check if Discord token is valid
npm run deploy
```

### High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart bot to clear memory
pm2 restart seolaxy-discord-bot

# Check for memory leaks in logs
pm2 logs seolaxy-discord-bot | grep -i memory
```

### Bot Goes Offline Randomly

```bash
# Check PM2 restart count
pm2 list

# View error logs
pm2 logs seolaxy-discord-bot --err

# Check system resources
htop
df -h
```

### Network Issues

```bash
# Test internet connection
ping discord.com

# Check DNS resolution
nslookup discord.com

# Test Discord API
curl -I https://discord.com/api/v10/gateway
```

## Performance Optimization

### 1. System Monitoring

```bash
# Install htop for system monitoring
sudo apt install htop

# Install iotop for disk I/O monitoring
sudo apt install iotop

# Check system resources
htop
iotop
free -h
df -h
```

### 2. PM2 Optimization

```bash
# Monitor PM2 processes
pm2 monit

# Set memory limit (restart if memory exceeds limit)
pm2 start ecosystem.config.js --max-memory-restart 1G

# Enable cluster mode (if your bot supports it)
# Edit ecosystem.config.js and change instances to 'max' or a number
```

### 3. Log Rotation

Create a logrotate configuration:

```bash
sudo nano /etc/logrotate.d/discord-bot
```

Add:
```
/var/www/seolaxy-discord-bot/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 botuser botuser
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Backup Strategy

### 1. Create Backup Script

```bash
nano backup-bot.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/home/botuser/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup bot files
tar -czf "$BACKUP_DIR/bot-$DATE.tar.gz" \
    /var/www/seolaxy-discord-bot \
    --exclude=/var/www/seolaxy-discord-bot/node_modules \
    --exclude=/var/www/seolaxy-discord-bot/logs

echo "Backup created: $BACKUP_DIR/bot-$DATE.tar.gz"

# Keep only last 7 backups
ls -t $BACKUP_DIR/bot-*.tar.gz | tail -n +8 | xargs rm -f
```

### 2. Automate Backups

```bash
# Make script executable
chmod +x backup-bot.sh

# Add to crontab (daily backup at 2 AM)
crontab -e

# Add this line:
0 2 * * * /home/botuser/backup-bot.sh
```

## Monitoring & Alerts

### 1. Set up PM2 Monitoring

```bash
# Install PM2 monitoring (optional)
npm install -g @pm2/io

# Link to PM2 monitoring dashboard
pm2 link <secret_key> <public_key>
```

### 2. Discord Webhook Alerts (Optional)

You can modify your bot to send alerts to a Discord channel when it restarts or encounters errors.

---

**Your bot should now be running 24/7 on your VPS! 🎉**

For any issues, check the [troubleshooting section](#troubleshooting) or refer to the main [README](../README.md).
