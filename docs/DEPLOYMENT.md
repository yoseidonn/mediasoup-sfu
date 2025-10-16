# mediasoup SFU Deployment Guide

## Production Deployment Options

### 1. Docker Deployment (Recommended)

#### Build and Run

```bash
# Build the image
docker build -t mediasoup-sfu .

# Run the container
docker run -d \
  --name mediasoup-sfu \
  -p 3000:3000 \
  -p 40000-49999:40000-49999/udp \
  -e ANNOUNCED_IP=YOUR_PUBLIC_IP \
  -v /var/log/mediasoup:/app/logs \
  mediasoup-sfu
```

#### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  mediasoup:
    build: .
    ports:
      - "3000:3000"
      - "40000-49999:40000-49999/udp"
    environment:
      - NODE_ENV=production
      - ANNOUNCED_IP=${MEDIASOUP_ANNOUNCED_IP}
      - RTC_MIN_PORT=40000
      - RTC_MAX_PORT=49999
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 2. System Service (systemd)

#### Setup

```bash
# Run the setup script
sudo ./scripts/setup-service.sh

# Edit the service file with your public IP
sudo nano /etc/systemd/system/mediasoup-sfu.service

# Start the service
sudo systemctl start mediasoup-sfu
sudo systemctl enable mediasoup-sfu
```

#### Service Management

```bash
# Start/Stop/Restart
sudo systemctl start mediasoup-sfu
sudo systemctl stop mediasoup-sfu
sudo systemctl restart mediasoup-sfu

# Check status
sudo systemctl status mediasoup-sfu

# View logs
sudo journalctl -u mediasoup-sfu -f
```

### 3. PM2 Process Manager

#### Setup

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### PM2 Management

```bash
# Start/Stop/Restart
pm2 start mediasoup-sfu
pm2 stop mediasoup-sfu
pm2 restart mediasoup-sfu

# Check status
pm2 status

# View logs
pm2 logs mediasoup-sfu

# Monitor
pm2 monit
```

## Environment Configuration

### Required Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Network Configuration (REQUIRED)
ANNOUNCED_IP=YOUR_PUBLIC_IP  # Your server's public IP address

# RTP Port Range
RTC_MIN_PORT=40000
RTC_MAX_PORT=49999

# Logging
LOG_LEVEL=info
```

### Optional Environment Variables

```bash
# Worker Configuration
WORKER_COUNT=auto  # or specific number

# FastAPI Integration
FASTAPI_URL=http://localhost:8000

# Security
ALLOWED_ORIGINS=http://localhost:8000,https://yourdomain.com
```

## Server Requirements

### Minimum Requirements

- **CPU**: 2 cores
- **RAM**: 2GB
- **Storage**: 10GB
- **Network**: 100 Mbps
- **OS**: Ubuntu 20.04+ or similar

### Recommended Requirements

- **CPU**: 4+ cores
- **RAM**: 4GB+
- **Storage**: 50GB+ SSD
- **Network**: 1 Gbps
- **OS**: Ubuntu 22.04 LTS

### Port Requirements

- **3000/tcp**: HTTP API
- **40000-49999/udp**: RTP streams

## Network Configuration

### Firewall Setup

```bash
# Allow HTTP API
sudo ufw allow 3000/tcp

# Allow RTP port range
sudo ufw allow 40000:49999/udp

# Allow SSH (if needed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

### NAT/Firewall Considerations

1. **Public IP**: Ensure your server has a public IP address
2. **Port Forwarding**: If behind NAT, forward ports 3000 and 40000-49999
3. **STUN/TURN**: Configure STUN/TURN servers for NAT traversal

## Load Balancing

### Multiple Instances

For high availability, run multiple mediasoup instances:

```yaml
# docker-compose.yml
version: '3.8'
services:
  mediasoup-1:
    build: .
    ports:
      - "3000:3000"
      - "40000-40099:40000-40099/udp"
    environment:
      - ANNOUNCED_IP=${MEDIASOUP_ANNOUNCED_IP}
      - RTC_MIN_PORT=40000
      - RTC_MAX_PORT=40099

  mediasoup-2:
    build: .
    ports:
      - "3001:3000"
      - "40100-40199:40100-40199/udp"
    environment:
      - ANNOUNCED_IP=${MEDIASOUP_ANNOUNCED_IP}
      - RTC_MIN_PORT=40100
      - RTC_MAX_PORT=40199
```

### Load Balancer Configuration

```nginx
# nginx.conf
upstream mediasoup_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://mediasoup_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring and Logging

### Health Checks

```bash
# Check service health
curl http://localhost:3000/health

# Check systemd service
sudo systemctl status mediasoup-sfu

# Check PM2 processes
pm2 status
```

### Log Management

```bash
# View logs
sudo journalctl -u mediasoup-sfu -f

# View PM2 logs
pm2 logs mediasoup-sfu

# View Docker logs
docker logs mediasoup-sfu -f
```

### Log Rotation

Create `/etc/logrotate.d/mediasoup`:

```
/var/log/mediasoup/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 mediasoup mediasoup
    postrotate
        systemctl reload mediasoup-sfu
    endscript
}
```

## Security Considerations

### 1. Firewall Configuration

```bash
# Only allow necessary ports
sudo ufw allow 3000/tcp
sudo ufw allow 40000:49999/udp
sudo ufw deny 22/tcp  # If not needed
```

### 2. User Permissions

```bash
# Run as non-root user
sudo useradd --system --shell /bin/false mediasoup
sudo chown -R mediasoup:mediasoup /opt/mediasoup
```

### 3. SSL/TLS

For production, use a reverse proxy with SSL:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check file permissions and user ownership
2. **Port Already in Use**: Kill existing processes or change ports
3. **Worker Creation Failed**: Check RTP port range availability
4. **Memory Issues**: Reduce worker count or increase server memory

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Check worker logs
tail -f logs/mediasoup/combined.log
```

### Performance Tuning

1. **Worker Count**: Set `WORKER_COUNT` to number of CPU cores
2. **Memory**: Monitor memory usage and adjust accordingly
3. **Network**: Ensure sufficient bandwidth for RTP streams
4. **CPU**: Monitor CPU usage and scale if needed

## Backup and Recovery

### Backup Strategy

```bash
# Backup configuration
tar -czf mediasoup-backup-$(date +%Y%m%d).tar.gz \
  /opt/mediasoup \
  /etc/systemd/system/mediasoup-sfu.service

# Backup logs
tar -czf mediasoup-logs-$(date +%Y%m%d).tar.gz \
  /var/log/mediasoup
```

### Recovery

```bash
# Restore from backup
tar -xzf mediasoup-backup-20251016.tar.gz -C /

# Restart service
sudo systemctl restart mediasoup-sfu
```
