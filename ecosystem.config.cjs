// pm2 ecosystem.config.cjs — cross-platform process manager config
// Usage:
//   pm2 start ecosystem.config.cjs
//   pm2 status
//   pm2 logs codex-bridge-feishu
//   pm2 stop codex-bridge-feishu

module.exports = {
  apps: [
    {
      name: 'codex-bridge-feishu',
      script: 'dist/daemon.mjs',
      cwd: __dirname,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      // Log rotation
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '.bridge/logs/pm2-error.log',
      out_file: '.bridge/logs/pm2-out.log',
      merge_logs: true,
      // Watch for config changes (restart gracefully)
      watch: ['config.env'],
      watch_delay: 3000,
      ignore_watch: ['node_modules', '.bridge', '.git', 'dist'],
    },
  ],
};
