#!/bin/bash

# mediasoup SFU Service Setup Script
# This script sets up mediasoup as a systemd service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up mediasoup SFU systemd service...${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${YELLOW}Project directory: $PROJECT_DIR${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 22+ first.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo -e "${RED}Node.js version 22+ is required. Current version: $(node -v)${NC}"
    exit 1
fi

# Create mediasoup user if it doesn't exist
if ! id "mediasoup" &>/dev/null; then
    echo -e "${YELLOW}Creating mediasoup user...${NC}"
    useradd --system --shell /bin/false --home-dir /var/lib/mediasoup --create-home mediasoup
    echo -e "${GREEN}Created mediasoup user${NC}"
else
    echo -e "${GREEN}mediasoup user already exists${NC}"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
cd "$PROJECT_DIR"
npm install --production

# Create logs directory
echo -e "${YELLOW}Creating logs directory...${NC}"
mkdir -p /var/log/mediasoup
chown mediasoup:mediasoup /var/log/mediasoup

# Create logs directory in project
mkdir -p "$PROJECT_DIR/logs/mediasoup"
chown mediasoup:mediasoup "$PROJECT_DIR/logs/mediasoup"

# Create systemd service file
echo -e "${YELLOW}Creating systemd service...${NC}"
cat > /etc/systemd/system/mediasoup-sfu.service << EOF
[Unit]
Description=mediasoup SFU Server for CrewDEV
Documentation=https://mediasoup.org/
After=network.target
Wants=network.target

[Service]
Type=simple
User=mediasoup
Group=mediasoup
WorkingDirectory=$PROJECT_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=ANNOUNCED_IP=YOUR_PUBLIC_IP
Environment=RTC_MIN_PORT=40000
Environment=RTC_MAX_PORT=49999
Environment=LOG_LEVEL=info
Environment=WORKER_COUNT=auto
ExecStart=/usr/bin/node server.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mediasoup-sfu

# Security settings
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

# Set proper ownership
chown -R mediasoup:mediasoup "$PROJECT_DIR"

# Reload systemd
systemctl daemon-reload

# Enable service
systemctl enable mediasoup-sfu

echo -e "${GREEN}mediasoup SFU service installed successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit /etc/systemd/system/mediasoup-sfu.service and update ANNOUNCED_IP with your public IP"
echo "2. Start the service: systemctl start mediasoup-sfu"
echo "3. Check status: systemctl status mediasoup-sfu"
echo "4. View logs: journalctl -u mediasoup-sfu -f"
echo ""
echo -e "${GREEN}Service management commands:${NC}"
echo "  Start:   systemctl start mediasoup-sfu"
echo "  Stop:    systemctl stop mediasoup-sfu"
echo "  Restart: systemctl restart mediasoup-sfu"
echo "  Status:  systemctl status mediasoup-sfu"
echo "  Logs:    journalctl -u mediasoup-sfu -f"
