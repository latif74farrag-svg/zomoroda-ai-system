module.exports = {
  apps: [
    {
      name: "zomoroda-server",
      script: "./server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "zomoroda-campaigns",
      script: "./master_all_campaigns.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "zomoroda-whatsapp",
      script: "./scripts/hotels_supplies_campaign.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "zomoroda-email",
      script: "./run_email.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
        SMTP_HOST: "mail.beautyhealtheg.com",
        SMTP_PORT: "465",
        SMTP_SECURE: "true",
        SMTP_USER: "a.farag@beautyhealtheg.com",
        SMTP_PASS: "hbom_3610504@SH",
        EMAIL_FROM: "a.farag@beautyhealtheg.com",
        EMAIL_BCC: "a.farag@beautyhealtheg.com"
      }
    }
  ]
};
