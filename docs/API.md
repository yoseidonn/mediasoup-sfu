# mediasoup SFU API Documentation

## Overview

The mediasoup SFU server provides a REST API for managing WebRTC rooms, transports, producers, and consumers.

## Base URL

```
http://localhost:3000
```

## Authentication

Currently, the API does not require authentication. In production, you should implement authentication middleware.

## Endpoints

### Health Check

#### GET /health

Returns the health status of the mediasoup server.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-16T11:49:24.123Z",
  "workers": 1,
  "rooms": 0,
  "version": "1.0.0"
}
```

### Room Management

#### POST /api/rooms/{roomId}/create

Creates a new room with a mediasoup router.

**Parameters:**
- `roomId` (path): Unique room identifier

**Response:**
```json
{
  "roomId": "room123",
  "routerId": "router456",
  "rtpCapabilities": { ... }
}
```

#### GET /api/rooms/{roomId}/status

Gets the status of a room.

**Response:**
```json
{
  "roomId": "room123",
  "active": true,
  "producers": 2,
  "consumers": 4,
  "transports": 3
}
```

### Transport Management

#### POST /api/rooms/{roomId}/transports/webrtc

Creates a new WebRTC transport.

**Request Body:**
```json
{
  "userId": "user123",
  "direction": "send"
}
```

**Response:**
```json
{
  "transportId": "transport789",
  "iceParameters": { ... },
  "iceCandidates": [ ... ],
  "dtlsParameters": { ... },
  "sctpParameters": { ... }
}
```

#### POST /api/transports/{transportId}/connect

Connects a WebRTC transport.

**Request Body:**
```json
{
  "dtlsParameters": { ... }
}
```

**Response:**
```json
{
  "status": "connected"
}
```

### Producer Management

#### POST /api/transports/{transportId}/produce

Creates a new producer.

**Request Body:**
```json
{
  "kind": "audio",
  "rtpParameters": { ... },
  "userId": "user123"
}
```

**Response:**
```json
{
  "producerId": "producer123"
}
```

#### GET /api/rooms/{roomId}/producers

Gets all producers in a room.

**Response:**
```json
[
  {
    "producerId": "producer123",
    "kind": "audio",
    "paused": false,
    "rtpParameters": { ... }
  }
]
```

#### DELETE /api/producers/{producerId}

Closes a producer.

**Response:**
```json
{
  "status": "closed"
}
```

### Consumer Management

#### POST /api/transports/{transportId}/consume

Creates a new consumer.

**Request Body:**
```json
{
  "producerId": "producer123",
  "rtpCapabilities": { ... },
  "userId": "user456"
}
```

**Response:**
```json
{
  "consumerId": "consumer123",
  "producerId": "producer123",
  "kind": "audio",
  "rtpParameters": { ... },
  "type": "simple",
  "paused": true
}
```

#### GET /api/rooms/{roomId}/consumers

Gets all consumers in a room.

**Response:**
```json
[
  {
    "consumerId": "consumer123",
    "producerId": "producer123",
    "kind": "audio",
    "paused": false,
    "rtpParameters": { ... }
  }
]
```

#### DELETE /api/consumers/{consumerId}

Closes a consumer.

**Response:**
```json
{
  "status": "closed"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request parameters"
}
```

### 404 Not Found
```json
{
  "error": "Room not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## WebRTC Integration

### Client Connection Flow

1. **Get Router Capabilities**
   ```javascript
   const response = await fetch('/api/rooms/room123/create');
   const { rtpCapabilities } = await response.json();
   ```

2. **Create Send Transport**
   ```javascript
   const response = await fetch('/api/rooms/room123/transports/webrtc', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ userId: 'user123', direction: 'send' })
   });
   const { transportId, iceParameters, iceCandidates, dtlsParameters } = await response.json();
   ```

3. **Create Receive Transport**
   ```javascript
   const response = await fetch('/api/rooms/room123/transports/webrtc', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ userId: 'user123', direction: 'recv' })
   });
   ```

4. **Connect Transports**
   ```javascript
   await fetch(`/api/transports/${sendTransportId}/connect`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ dtlsParameters })
   });
   ```

5. **Produce Media**
   ```javascript
   const response = await fetch(`/api/transports/${sendTransportId}/produce`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       kind: 'audio',
       rtpParameters,
       userId: 'user123'
     })
   });
   const { producerId } = await response.json();
   ```

6. **Consume Media**
   ```javascript
   const response = await fetch(`/api/transports/${recvTransportId}/consume`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       producerId: 'producer123',
       rtpCapabilities,
       userId: 'user456'
     })
   });
   const { consumerId, rtpParameters } = await response.json();
   ```

## Rate Limiting

Currently, there is no rate limiting implemented. In production, consider implementing rate limiting to prevent abuse.

## CORS

The API includes CORS headers to allow cross-origin requests. Configure `ALLOWED_ORIGINS` in your environment variables for production.
