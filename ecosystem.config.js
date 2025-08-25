module.exports = {
  apps: [
    {
      name: "seolaxy-discord-bot",
      script: "src/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        LOG_LEVEL: "info",
      },
      env_development: {
        NODE_ENV: "development",
        LOG_LEVEL: "debug",
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // Restart policy
      max_restarts: 10,
      min_uptime: "10s",

      // Advanced PM2 features
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Cron restart (optional - restart every day at 3 AM)
      // cron_restart: '0 3 * * *',

      // Source map support
      source_map_support: true,

      // Instance variables
      instance_var: "INSTANCE_ID",
    },
  ],

  deploy: {
    production: {
      user: "ubuntu",
      host: "your-vps-ip-address",
      ref: "origin/main",
      repo: "https://github.com/yourusername/seolaxy-discord-bot.git",
      path: "/var/www/seolaxy-discord-bot",
      "pre-deploy-local": "",
      "post-deploy":
        "npm install && npm run deploy && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "",
    },
  },
};
