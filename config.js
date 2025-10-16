const os = require('os');

const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1',
  
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
      'rtx',
      'bwe',
      'score',
      'simulcast',
      'svc',
      'sctp'
    ]
  },
  
  // Router configuration
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
        parameters: {
          useinbandfec: 1
        }
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000
        }
      },
      {
        kind: 'video',
        mimeType: 'video/VP9',
        clockRate: 90000,
        parameters: {
          'profile-id': 2,
          'x-google-start-bitrate': 1000
        }
      },
      {
        kind: 'video',
        mimeType: 'video/h264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '4d0032',
          'level-asymmetry-allowed': 1,
          'x-google-start-bitrate': 1000
        }
      },
      {
        kind: 'video',
        mimeType: 'video/h264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '42e01f',
          'level-asymmetry-allowed': 1,
          'x-google-start-bitrate': 1000
        }
      }
    ],
    appData: {
      router: {
        logLevel: process.env.ROUTER_LOG_LEVEL || 'warn'
      }
    }
  },
  
  // WebRTC transport configuration
  webRtcTransport: {
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1'
      }
    ],
    maxIncomingBitrate: 1500000,
    initialAvailableOutgoingBitrate: 1000000,
    minimumAvailableOutgoingBitrate: 600000,
    maxSctpMessageSize: 262144,
    maxSctpSendBufferSize: 262144,
    enableSctp: true,
    enableTcp: true,
    enableUdp: true,
    preferUdp: true,
    enableSrtp: false
  },
  
  // Producer configuration
  producer: {
    kind: 'audio',
    rtpParameters: {
      codecs: [],
      headerExtensions: [],
      encodings: [],
      rtcp: {
        cname: 'mediasoup-sfu'
      }
    }
  },
  
  // Consumer configuration
  consumer: {
    kind: 'audio',
    rtpCapabilities: {
      codecs: [],
      headerExtensions: [],
      fecMechanisms: []
    }
  },
  
  // Worker pool configuration
  workerPool: {
    workers: []
  }
};

// Calculate worker count based on CPU cores
const workerCount = process.env.WORKER_COUNT === 'auto' 
  ? Math.max(1, Math.floor(os.cpus().length / 2))
  : parseInt(process.env.WORKER_COUNT) || 1;

config.workerCount = workerCount;

module.exports = config;
