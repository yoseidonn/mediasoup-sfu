#!/bin/bash
# Mediasoup SFU Server Setup Script for /opt/mediasoup-sfu
# Installs Node.js dependencies, sets proper permissions, installs systemd service

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Directories and files
MEDIASOUP_DIR="/opt/mediasoup-sfu"
LOGS_DIR="$MEDIASOUP_DIR/logs"
SERVICE_FILE="/etc/systemd/system/mediasoup-sfu.service"
CONFIG_FILE="$MEDIASOUP_DIR/config.js"
ENV_FILE="$MEDIASOUP_DIR/.env"

echo -e "${BLUE}🚀 Mediasoup SFU Server Setup Script${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root${NC}"
   exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 22+ first.${NC}"
    echo "Install with: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo -e "${RED}❌ Node.js version 22+ is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Create mediasoup user if missing
if ! id mediasoup &>/dev/null; then
    echo -e "${YELLOW}👤 Creating system user 'mediasoup'...${NC}"
    useradd --system --shell /bin/false --home-dir /var/lib/mediasoup --create-home mediasoup
    echo -e "${GREEN}✅ User created${NC}"
else
    echo -e "${GREEN}✅ User 'mediasoup' already exists${NC}"
fi

# Create directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
# Remove old installation if exists
if [ -d "$MEDIASOUP_DIR" ]; then
    echo -e "${YELLOW}🗑️  Removing old installation at $MEDIASOUP_DIR${NC}"
    rm -rf "$MEDIASOUP_DIR"
fi
mkdir -p "$LOGS_DIR"
chown -R mediasoup:mediasoup "$MEDIASOUP_DIR"
chmod 750 "$MEDIASOUP_DIR"
chmod 750 "$LOGS_DIR"
echo -e "${GREEN}✅ Directories ready${NC}"

# Copy project files to /opt
echo -e "${YELLOW}📋 Copying project files...${NC}"
# Copy essential files
cp -r /home/yusuf/Software/CrewDEV/mediasoup-sfu/* "$MEDIASOUP_DIR/" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Source files not found, creating minimal structure...${NC}"
    # Create minimal package.json
    cat > "$MEDIASOUP_DIR/package.json" <<EOF
{
  "name": "mediasoup-sfu",
  "version": "1.0.0",
  "description": "Mediasoup SFU Server for CrewDEV",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "mediasoup": "^3.13.16",
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "dotenv": "^16.3.1"
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
EOF
}

# Install dependencies
echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
cd "$MEDIASOUP_DIR"
npm install --production --silent
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Create example .env file
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}📝 Creating example .env file...${NC}"
    cat > "$ENV_FILE" <<EOF
# Mediasoup SFU Configuration
# Edit this file with your actual values

# Server Configuration
PORT=3000
NODE_ENV=production

# Network Configuration
ANNOUNCED_IP=YOUR_PUBLIC_IP_HERE
ANNOUNCED_PORT=3000

# RTC Configuration
RTC_MIN_PORT=40000
RTC_MAX_PORT=49999

# Worker Configuration
WORKER_COUNT=auto
WORKER_LOG_LEVEL=warn

# Logging
LOG_LEVEL=info
LOG_FILE=$LOGS_DIR/mediasoup.log

# Redis Configuration (if using Redis for clustering)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=3

# SSL/TLS Configuration (optional)
SSL_CERT_PATH=
SSL_KEY_PATH=

# Authentication
API_SECRET=your-api-secret-here-change-in-production

# Performance Tuning
MAX_CONCURRENT_ROOMS=100
MAX_PEERS_PER_ROOM=50
EOF
    chown mediasoup:mediasoup "$ENV_FILE"
    chmod 640 "$ENV_FILE"
    echo -e "${GREEN}✅ Example .env created at $ENV_FILE${NC}"
fi

# Create example config.js if not exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}📝 Creating example config.js...${NC}"
    cat > "$CONFIG_FILE" <<EOF
// Mediasoup SFU Configuration
require('dotenv').config();

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1',
    announcedPort: process.env.ANNOUNCED_PORT || 3000,
  },

  // Mediasoup configuration
  mediasoup: {
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
      ],
    },
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1',
        },
      ],
      maxIncomingBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
    },
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || '$LOGS_DIR/mediasoup.log',
  },

  // Performance limits
  limits: {
    maxConcurrentRooms: parseInt(process.env.MAX_CONCURRENT_ROOMS) || 100,
    maxPeersPerRoom: parseInt(process.env.MAX_PEERS_PER_ROOM) || 50,
  },
};
EOF
    chown mediasoup:mediasoup "$CONFIG_FILE"
    chmod 640 "$CONFIG_FILE"
    echo -e "${GREEN}✅ Example config.js created at $CONFIG_FILE${NC}"
fi

# Create basic server.js if not exists
if [ ! -f "$MEDIASOUP_DIR/server.js" ]; then
    echo -e "${YELLOW}📝 Creating basic server.js...${NC}"
    cat > "$MEDIASOUP_DIR/server.js" <<EOF
// Basic Mediasoup SFU Server
const express = require('express');
const { createWorker } = require('mediasoup');
const config = require('./config');

const app = express();
const port = config.server.port;

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, config.server.host, () => {
  console.log(\`Mediasoup SFU server running on \${config.server.host}:\${port}\`);
  console.log(\`Announced IP: \${config.server.announcedIp}\`);
  console.log(\`RTC Port Range: \${config.mediasoup.worker.rtcMinPort}-\${config.mediasoup.worker.rtcMaxPort}\`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});
EOF
    chown mediasoup:mediasoup "$MEDIASOUP_DIR/server.js"
    chmod 640 "$MEDIASOUP_DIR/server.js"
    echo -e "${GREEN}✅ Basic server.js created${NC}"
fi

# Test configuration
echo -e "${YELLOW}🧪 Testing configuration...${NC}"
if node -c "$CONFIG_FILE"; then
    echo -e "${GREEN}✅ Configuration is valid${NC}"
else
    echo -e "${RED}❌ Configuration test failed${NC}"
    echo "Please check your config.js file for errors."
    exit 1
fi

# Create systemd service
echo -e "${YELLOW}📋 Installing systemd service...${NC}"
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Mediasoup SFU Server for CrewDEV
Documentation=https://mediasoup.org/
After=network.target
Wants=network.target

[Service]
Type=simple
User=mediasoup
Group=mediasoup
WorkingDirectory=$MEDIASOUP_DIR
Environment=NODE_ENV=production
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/node server.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mediasoup-sfu

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 3000/tcp
    ufw allow 40000:49999/udp
    echo -e "${GREEN}✅ UFW firewall configured${NC}"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=3000/tcp
    firewall-cmd --permanent --add-port=40000-49999/udp
    firewall-cmd --reload
    echo -e "${GREEN}✅ firewalld configured${NC}"
else
    echo -e "${YELLOW}⚠️  No firewall detected, please configure manually${NC}"
fi

# Enable and start service
echo -e "${YELLOW}🚀 Starting mediasoup-sfu service...${NC}"
systemctl daemon-reload
systemctl enable mediasoup-sfu
systemctl start mediasoup-sfu

# Check service status
echo -e "${YELLOW}📊 Checking service status...${NC}"
sleep 2
if systemctl is-active --quiet mediasoup-sfu; then
    echo -e "${GREEN}✅ Mediasoup SFU is running successfully!${NC}"
else
    echo -e "${RED}❌ Mediasoup SFU failed to start${NC}"
    echo "Check logs: sudo journalctl -u mediasoup-sfu -f"
    exit 1
fi

echo -e "${BLUE}🎉 Setup complete!${NC}"
echo "Logs: $LOGS_DIR"
echo "Config: $CONFIG_FILE"
echo "Environment: $ENV_FILE"
echo "Service: $SERVICE_FILE"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Edit environment: sudo nano $ENV_FILE"
echo "2. Set ANNOUNCED_IP: ANNOUNCED_IP=YOUR_PUBLIC_IP"
echo "3. Configure RTC ports: RTC_MIN_PORT=40000, RTC_MAX_PORT=49999"
echo "4. Restart service: sudo systemctl restart mediasoup-sfu"
echo "5. Test connection: curl http://localhost:3000/health"
