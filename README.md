# mediasoup SFU Server

A production-ready mediasoup SFU (Selective Forwarding Unit) server for CrewDEV voice/video communication.

## 🏗️ Architecture

This mediasoup server works alongside the CrewDEV FastAPI backend to provide:
- **WebRTC SFU functionality** for voice/video calls
- **REST API** for FastAPI integration
- **Worker-based scaling** (one worker per CPU core)
- **Production-ready logging** and monitoring

```
┌─────────────────────┐
│   FastAPI Backend   │
│  (Signaling, Auth)  │
└─────────┬───────────┘
          │ HTTP REST API
          │
┌─────────▼─────────────┐
│   mediasoup SFU       │
│  (RTP Streams)        │
└─────────┬─────────────┘
          │
          │ WebRTC RTP
          │
┌─────────▼─────────────┐
│      Clients          │
│  (Browsers/Apps)      │
└───────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v22.0.0 or higher
- **Linux**: Ubuntu 20.04+ or similar
- **Ports**: 3000 (HTTP), 40000-49999 (UDP RTP)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd mediasoup-sfu
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   nano .env
   ```

4. **Start the server**:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

### Docker Deployment

```bash
# Build image
docker build -t mediasoup-sfu .

# Run container
docker run -d \
  --name mediasoup-sfu \
  -p 3000:3000 \
  -p 40000-49999:40000-49999/udp \
  -e ANNOUNCED_IP=YOUR_PUBLIC_IP \
  mediasoup-sfu
```

### System Service (Production)

```bash
# Run setup script
sudo ./scripts/setup-service.sh

# Start service
sudo systemctl start mediasoup
sudo systemctl enable mediasoup
```

## 📁 Project Structure

```
mediasoup-sfu/
├── server.js              # Main server entry point
├── config.js              # mediasoup configuration
├── api.js                 # REST API endpoints
├── logger.js              # Winston logging setup
├── package.json           # Dependencies and scripts
├── Dockerfile             # Docker configuration
├── ecosystem.config.js    # PM2 configuration
├── .env.example           # Environment variables template
├── scripts/
│   ├── setup-service.sh   # systemd service setup
│   └── setup-pm2.sh       # PM2 setup
├── docs/
│   ├── API.md             # API documentation
│   ├── DEPLOYMENT.md      # Deployment guide
│   └── TROUBLESHOOTING.md # Common issues
└── logs/                  # Log files (created at runtime)
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `ANNOUNCED_IP` | Public IP for RTP | `127.0.0.1` |
| `RTC_MIN_PORT` | Min RTP port | `40000` |
| `RTC_MAX_PORT` | Max RTP port | `49999` |
| `LOG_LEVEL` | Logging level | `info` |
| `WORKER_COUNT` | Number of workers | `auto` |

### mediasoup Configuration

Edit `config.js` to customize:
- **Media codecs** (Opus, VP8, VP9, H264)
- **Worker settings** (CPU cores, logging)
- **RTP port ranges**
- **WebRTC transport settings**

## 🔌 API Endpoints

### Health Check
```http
GET /health
```

### Room Management
```http
POST /api/rooms/{roomId}/create
GET  /api/rooms/{roomId}/status
```

### Transport Management
```http
POST /api/rooms/{roomId}/transports/webrtc
POST /api/transports/{transportId}/connect
```

### Producer/Consumer Management
```http
POST /api/transports/{transportId}/produce
POST /api/transports/{transportId}/consume
GET  /api/rooms/{roomId}/producers
DELETE /api/producers/{producerId}
DELETE /api/consumers/{consumerId}
```

## 🐳 Docker

### Build Image
```bash
docker build -t mediasoup-sfu .
```

### Run Container
```bash
docker run -d \
  --name mediasoup-sfu \
  -p 3000:3000 \
  -p 40000-49999:40000-49999/udp \
  -e ANNOUNCED_IP=YOUR_PUBLIC_IP \
  -v /var/log/mediasoup:/app/logs \
  mediasoup-sfu
```

### Docker Compose
```yaml
version: '3.8'
services:
  mediasoup:
    build: .
    ports:
      - "3000:3000"
      - "40000-49999:40000-49999/udp"
    environment:
      - ANNOUNCED_IP=${MEDIASOUP_ANNOUNCED_IP}
    volumes:
      - ./logs:/app/logs
```

## 🔧 Process Management

### PM2 (Recommended for Development)
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit
```

### systemd (Recommended for Production)
```bash
# Setup service
sudo ./scripts/setup-service.sh

# Manage service
sudo systemctl start mediasoup
sudo systemctl stop mediasoup
sudo systemctl restart mediasoup
sudo systemctl status mediasoup
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Logs
```bash
# PM2 logs
pm2 logs mediasoup-sfu

# systemd logs
sudo journalctl -u mediasoup -f

# Docker logs
docker logs mediasoup-sfu -f
```

### Metrics
- **Workers**: Number of active mediasoup workers
- **Rooms**: Number of active rooms
- **Memory**: Process memory usage
- **CPU**: Worker CPU usage

## 🔗 Integration with FastAPI

This mediasoup server is designed to work with the CrewDEV FastAPI backend:

1. **FastAPI** handles signaling, authentication, and WebSocket communication
2. **mediasoup** handles RTP streams and media forwarding
3. **Communication** via HTTP REST API

### FastAPI Integration Example
```python
# FastAPI service calls mediasoup
import httpx

async def create_room_router(channel_id: int):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"http://localhost:3000/api/rooms/{channel_id}/create"
        )
        return response.json()
```

## 🚨 Troubleshooting

### Common Issues

1. **Permission denied**: Check directory permissions
2. **Port already in use**: Kill existing processes on port 3000
3. **Worker creation failed**: Check RTP port range availability
4. **Memory issues**: Reduce worker count or increase server memory

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Check worker logs
tail -f logs/mediasoup/combined.log
```

## 📚 Documentation

- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Create an issue on GitHub
- **Documentation**: Check the `docs/` directory
- **Logs**: Check `logs/mediasoup/` directory

---

**Built for CrewDEV** - A modern voice/video communication platform.
