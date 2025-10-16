const express = require('express');
const cors = require('cors');
const { mediasoup } = require('./server');
const logger = require('./logger');

const router = express.Router();

// Enable CORS for all routes
router.use(cors());

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    workers: mediasoup.workers.length,
    rooms: Object.keys(mediasoup.rooms).length
  });
});

// Create router for a room/channel
router.post('/rooms/:roomId/create', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { rtpCapabilities } = req.body;
    
    logger.info(`Creating router for room ${roomId}`);
    
    // Check if room already exists
    if (mediasoup.rooms[roomId]) {
      return res.json({
        success: true,
        roomId,
        routerId: mediasoup.rooms[roomId].router.id,
        rtpCapabilities: mediasoup.rooms[roomId].router.rtpCapabilities
      });
    }
    
    // Get least loaded worker
    const worker = mediasoup.getLeastLoadedWorker();
    if (!worker) {
      return res.status(500).json({ error: 'No workers available' });
    }
    
    // Create router
    const router = await worker.createRouter({
      mediaCodecs: mediasoup.config.router.mediaCodecs,
      appData: mediasoup.config.router.appData
    });
    
    // Store room
    mediasoup.rooms[roomId] = {
      router,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map()
    };
    
    logger.info(`Router created for room ${roomId} on worker ${worker.pid}`);
    
    res.json({
      success: true,
      roomId,
      routerId: router.id,
      rtpCapabilities: router.rtpCapabilities
    });
    
  } catch (error) {
    logger.error(`Error creating router for room ${req.params.roomId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Create WebRTC transport
router.post('/rooms/:roomId/transports/webrtc', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { direction, userId } = req.body; // direction: 'send' or 'recv'
    
    logger.info(`Creating ${direction} transport for room ${roomId}, user ${userId}`);
    
    const room = mediasoup.rooms[roomId];
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Create WebRTC transport
    const transport = await room.router.createWebRtcTransport({
      ...mediasoup.config.webRtcTransport,
      appData: { userId, direction }
    });
    
    // Store transport
    const transportId = transport.id;
    room.transports.set(transportId, transport);
    
    // Handle transport events
    transport.on('dtlsstatechange', (dtlsState) => {
      logger.info(`Transport ${transportId} DTLS state: ${dtlsState}`);
    });
    
    transport.on('@close', () => {
      logger.info(`Transport ${transportId} closed`);
      room.transports.delete(transportId);
    });
    
    logger.info(`WebRTC transport created: ${transportId}`);
    
    res.json({
      success: true,
      transportId,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters
    });
    
  } catch (error) {
    logger.error(`Error creating transport for room ${req.params.roomId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Connect transport
router.post('/transports/:transportId/connect', async (req, res) => {
  try {
    const { transportId } = req.params;
    const { dtlsParameters } = req.body;
    
    logger.info(`Connecting transport ${transportId}`);
    
    const transport = mediasoup.findTransport(transportId);
    if (!transport) {
      return res.status(404).json({ error: 'Transport not found' });
    }
    
    await transport.connect({ dtlsParameters });
    
    logger.info(`Transport ${transportId} connected successfully`);
    
    res.json({ success: true });
    
  } catch (error) {
    logger.error(`Error connecting transport ${req.params.transportId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Create producer
router.post('/transports/:transportId/produce', async (req, res) => {
  try {
    const { transportId } = req.params;
    const { kind, rtpParameters, userId, channelId } = req.body;
    
    logger.info(`Creating producer for transport ${transportId}, kind: ${kind}`);
    
    const transport = mediasoup.findTransport(transportId);
    if (!transport) {
      return res.status(404).json({ error: 'Transport not found' });
    }
    
    // Create producer
    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: { userId, channelId }
    });
    
    // Store producer
    const room = mediasoup.findRoomByTransport(transportId);
    if (room) {
      room.producers.set(producer.id, producer);
    }
    
    // Handle producer events
    producer.on('transportclose', () => {
      logger.info(`Producer ${producer.id} transport closed`);
      if (room) {
        room.producers.delete(producer.id);
      }
    });
    
    producer.on('@close', () => {
      logger.info(`Producer ${producer.id} closed`);
      if (room) {
        room.producers.delete(producer.id);
      }
    });
    
    logger.info(`Producer created: ${producer.id}`);
    
    res.json({
      success: true,
      producerId: producer.id,
      kind: producer.kind
    });
    
  } catch (error) {
    logger.error(`Error creating producer for transport ${req.params.transportId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Create consumer
router.post('/transports/:transportId/consume', async (req, res) => {
  try {
    const { transportId } = req.params;
    const { producerId, rtpCapabilities, userId, channelId } = req.body;
    
    logger.info(`Creating consumer for transport ${transportId}, producer: ${producerId}`);
    
    const transport = mediasoup.findTransport(transportId);
    if (!transport) {
      return res.status(404).json({ error: 'Transport not found' });
    }
    
    const room = mediasoup.findRoomByTransport(transportId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const producer = room.producers.get(producerId);
    if (!producer) {
      return res.status(404).json({ error: 'Producer not found' });
    }
    
    // Check if router can consume this producer
    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      return res.status(400).json({ error: 'Cannot consume this producer' });
    }
    
    // Create consumer
    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      appData: { userId, channelId }
    });
    
    // Store consumer
    room.consumers.set(consumer.id, consumer);
    
    // Handle consumer events
    consumer.on('transportclose', () => {
      logger.info(`Consumer ${consumer.id} transport closed`);
      room.consumers.delete(consumer.id);
    });
    
    consumer.on('@close', () => {
      logger.info(`Consumer ${consumer.id} closed`);
      room.consumers.delete(consumer.id);
    });
    
    logger.info(`Consumer created: ${consumer.id}`);
    
    res.json({
      success: true,
      consumerId: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters
    });
    
  } catch (error) {
    logger.error(`Error creating consumer for transport ${req.params.transportId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get room producers
router.get('/rooms/:roomId/producers', (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = mediasoup.rooms[roomId];
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const producers = Array.from(room.producers.values()).map(producer => ({
      id: producer.id,
      kind: producer.kind,
      userId: producer.appData.userId,
      channelId: producer.appData.channelId
    }));
    
    res.json({
      success: true,
      producers
    });
    
  } catch (error) {
    logger.error(`Error getting producers for room ${req.params.roomId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Close producer
router.delete('/producers/:producerId', async (req, res) => {
  try {
    const { producerId } = req.params;
    
    logger.info(`Closing producer ${producerId}`);
    
    const producer = mediasoup.findProducer(producerId);
    if (!producer) {
      return res.status(404).json({ error: 'Producer not found' });
    }
    
    producer.close();
    
    logger.info(`Producer ${producerId} closed`);
    
    res.json({ success: true });
    
  } catch (error) {
    logger.error(`Error closing producer ${req.params.producerId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Close consumer
router.delete('/consumers/:consumerId', async (req, res) => {
  try {
    const { consumerId } = req.params;
    
    logger.info(`Closing consumer ${consumerId}`);
    
    const consumer = mediasoup.findConsumer(consumerId);
    if (!consumer) {
      return res.status(404).json({ error: 'Consumer not found' });
    }
    
    consumer.close();
    
    logger.info(`Consumer ${consumerId} closed`);
    
    res.json({ success: true });
    
  } catch (error) {
    logger.error(`Error closing consumer ${req.params.consumerId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get room status
router.get('/rooms/:roomId/status', (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = mediasoup.rooms[roomId];
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const status = {
      roomId,
      routerId: room.router.id,
      transportCount: room.transports.size,
      producerCount: room.producers.size,
      consumerCount: room.consumers.size,
      producers: Array.from(room.producers.values()).map(producer => ({
        id: producer.id,
        kind: producer.kind,
        userId: producer.appData.userId,
        channelId: producer.appData.channelId
      }))
    };
    
    res.json({
      success: true,
      ...status
    });
    
  } catch (error) {
    logger.error(`Error getting status for room ${req.params.roomId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
