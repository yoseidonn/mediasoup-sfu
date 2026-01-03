require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createWorker } = require('mediasoup');
const config = require('./config');
const logger = require('./logger');
const api = require('./api');

class MediaSoupServer {
  constructor() {
    this.app = express();
    this.workers = [];
    this.rooms = {};
    this.config = config;
    
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  setupMiddleware() {
    // Enable CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8000', 'http://localhost:8001', 'http://localhost:8002', 'http://localhost:8003'],
      credentials: true
    }));
    
    // Parse JSON bodies
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }
  
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        workers: this.workers.length,
        rooms: Object.keys(this.rooms).length,
        version: require('./package.json').version
      });
    });
    
    // API routes
    // Set mediasoup instance in API router before mounting
    api.setMediasoup(this);
    this.app.use('/api', api);
    
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
    
    // Error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  }
  
  async createWorkers() {
    logger.info(`Creating ${this.config.workerCount} mediasoup workers...`);
    
    for (let i = 0; i < this.config.workerCount; i++) {
      try {
        const worker = await createWorker({
          logLevel: this.config.worker.logLevel,
          logTags: this.config.worker.logTags,
          rtcMinPort: this.config.worker.rtcMinPort,
          rtcMaxPort: this.config.worker.rtcMaxPort,
          appData: { workerId: i }
        });
        
        worker.on('died', () => {
          logger.error(`Worker ${worker.pid} died, exiting in 2 seconds...`);
          setTimeout(() => process.exit(1), 2000);
        });
        
        this.workers.push(worker);
        logger.info(`Worker ${i} created with PID ${worker.pid}`);
        
      } catch (error) {
        logger.error(`Failed to create worker ${i}:`, error);
        throw error;
      }
    }
    
    logger.info(`Created ${this.workers.length} workers successfully`);
  }
  
  getLeastLoadedWorker() {
    if (this.workers.length === 0) {
      return null;
    }
    
    // Simple round-robin for now
    // In production, you might want to track actual load
    return this.workers[Math.floor(Math.random() * this.workers.length)];
  }
  
  findTransport(transportId) {
    for (const room of Object.values(this.rooms)) {
      const transport = room.transports.get(transportId);
      if (transport) {
        return transport;
      }
    }
    return null;
  }
  
  findProducer(producerId) {
    for (const room of Object.values(this.rooms)) {
      const producer = room.producers.get(producerId);
      if (producer) {
        return producer;
      }
    }
    return null;
  }
  
  findConsumer(consumerId) {
    for (const room of Object.values(this.rooms)) {
      const consumer = room.consumers.get(consumerId);
      if (consumer) {
        return consumer;
      }
    }
    return null;
  }
  
  findRoomByTransport(transportId) {
    for (const room of Object.values(this.rooms)) {
      if (room.transports.has(transportId)) {
        return room;
      }
    }
    return null;
  }
  
  async start() {
    try {
      // Create workers
      await this.createWorkers();
      
      // Start HTTP server
      const port = this.config.port;
      this.server = this.app.listen(port, '0.0.0.0', () => {
        logger.info(`mediasoup SFU server running on port ${port}`);
        logger.info(`Workers: ${this.workers.length}`);
        logger.info(`RTC ports: ${this.config.worker.rtcMinPort}-${this.config.worker.rtcMaxPort}`);
        logger.info(`Announced IP: ${this.config.announcedIp}`);
      });
      
      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
  
  async shutdown() {
    logger.info('Shutting down mediasoup server...');
    
    // Close all rooms
    for (const [roomId, room] of Object.entries(this.rooms)) {
      logger.info(`Closing room ${roomId}`);
      room.router.close();
    }
    this.rooms = {};
    
    // Close all workers
    for (const worker of this.workers) {
      worker.close();
    }
    this.workers = [];
    
    // Close HTTP server
    if (this.server) {
      this.server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    }
  }
}

// Create and start server
const server = new MediaSoupServer();

server.start().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = server;
