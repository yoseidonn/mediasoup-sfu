// Mediasoup SFU Configuration Example
// Copy this file to config.js and modify as needed

require('dotenv').config();

module.exports = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1',
    announcedPort: parseInt(process.env.ANNOUNCED_PORT) || 3000,
  },

  // Mediasoup configuration
  mediasoup: {
    // Worker configuration
    worker: {
      rtcMinPort: parseInt(process.env.RTC_MIN_PORT) || 40000,
      rtcMaxPort: parseInt(process.env.RTC_MAX_PORT) || 49999,
      logLevel: process.env.WORKER_LOG_LEVEL || 'warn',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
      ],
    },

    // Router configuration
    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/VP9',
          clockRate: 90000,
          parameters: {
            'profile-id': 2,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '4d0032',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/AV1',
          clockRate: 90000,
        },
      ],
    },

    // WebRTC Transport configuration
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1',
        },
      ],
      maxIncomingBitrate: parseInt(process.env.MAX_INCOMING_BITRATE) || 1500000,
      initialAvailableOutgoingBitrate: parseInt(process.env.INITIAL_OUTGOING_BITRATE) || 1000000,
    },

    // Plain Transport configuration (for testing)
    plainTransport: {
      listenIp: {
        ip: '0.0.0.0',
        announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1',
      },
      maxSctpMessageSize: 262144,
    },
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || '/opt/mediasoup-sfu/logs/mediasoup.log',
    console: process.env.NODE_ENV !== 'production',
  },

  // Performance limits
  limits: {
    maxConcurrentRooms: parseInt(process.env.MAX_CONCURRENT_ROOMS) || 100,
    maxPeersPerRoom: parseInt(process.env.MAX_PEERS_PER_ROOM) || 50,
    maxWorkers: parseInt(process.env.WORKER_COUNT) || require('os').cpus().length,
  },

  // Redis configuration (for clustering)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    db: parseInt(process.env.REDIS_DB) || 3,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // SSL/TLS configuration
  ssl: {
    cert: process.env.SSL_CERT_PATH || undefined,
    key: process.env.SSL_KEY_PATH || undefined,
    port: parseInt(process.env.SSL_PORT) || 3443,
  },

  // Authentication
  auth: {
    apiSecret: process.env.API_SECRET || 'your-api-secret-here',
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-here',
  },

  // Health check configuration
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
  },

  // Development settings
  development: {
    reload: process.env.DEV_RELOAD === 'true',
    debug: process.env.DEV_DEBUG === 'true',
  },
};
