#!/bin/bash

# mediasoup SFU PM2 Setup Script
# This script sets up mediasoup using PM2 process manager

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up mediasoup SFU with PM2...${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${YELLOW}Project directory: $PROJECT_DIR${NC}"

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

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 is not installed. Installing PM2...${NC}"
    npm install -g pm2
    echo -e "${GREEN}PM2 installed successfully${NC}"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
cd "$PROJECT_DIR"
npm install --production

# Create logs directory
echo -e "${YELLOW}Creating logs directory...${NC}"
mkdir -p "$PROJECT_DIR/logs/mediasoup"

# Update ecosystem config with correct paths
echo -e "${YELLOW}Updating PM2 configuration...${NC}"
sed -i "s|PROJECT_DIR_PLACEHOLDER|$PROJECT_DIR|g" "$PROJECT_DIR/ecosystem.config.js"

# Start mediasoup with PM2
echo -e "${YELLOW}Starting mediasoup with PM2...${NC}"
cd "$PROJECT_DIR"
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

echo -e "${GREEN}mediasoup SFU started with PM2 successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit $PROJECT_DIR/ecosystem.config.js and update ANNOUNCED_IP with your public IP"
echo "2. Restart the service: pm2 restart mediasoup-sfu"
echo ""
echo -e "${GREEN}PM2 management commands:${NC}"
echo "  Start:   pm2 start mediasoup-sfu"
echo "  Stop:    pm2 stop mediasoup-sfu"
echo "  Restart: pm2 restart mediasoup-sfu"
echo "  Status:  pm2 status"
echo "  Logs:    pm2 logs mediasoup-sfu"
echo "  Monitor: pm2 monit"
