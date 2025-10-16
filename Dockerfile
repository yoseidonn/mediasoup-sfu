FROM node:18-alpine

# Install dependencies for mediasoup
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    linux-headers

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs/mediasoup

# Create non-root user
RUN addgroup -g 1001 -S mediasoup && \
    adduser -S mediasoup -u 1001

# Change ownership
RUN chown -R mediasoup:mediasoup /app

# Switch to non-root user
USER mediasoup

# Expose ports
EXPOSE 3000
EXPOSE 40000-49999/udp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
