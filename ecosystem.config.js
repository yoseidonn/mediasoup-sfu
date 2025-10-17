module.exports = {
  apps: [{
    name: 'mediasoup-sfu',
    script: 'server.js',
    cwd: 'PROJECT_DIR_PLACEHOLDER',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      ANNOUNCED_IP: '127.0.0.1',
      RTC_MIN_PORT: 40000,
      RTC_MAX_PORT: 49999,
      LOG_LEVEL: 'info',
      WORKER_COUNT: 'auto',
      WORKER_LOG_LEVEL: 'warn',
      ROUTER_LOG_LEVEL: 'warn'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      ANNOUNCED_IP: 'YOUR_PUBLIC_IP',
      RTC_MIN_PORT: 40000,
      RTC_MAX_PORT: 49999,
      LOG_LEVEL: 'info',
      WORKER_COUNT: 'auto',
      WORKER_LOG_LEVEL: 'warn',
      ROUTER_LOG_LEVEL: 'warn'
    },
    log_file: './logs/mediasoup/pm2-combined.log',
    out_file: './logs/mediasoup/pm2-out.log',
    error_file: './logs/mediasoup/pm2-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
