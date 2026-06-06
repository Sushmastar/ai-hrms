'use strict';

require('express-async-errors');
const http = require('http');
const app = require('./app');
const { initSocketIO } = require('./config/socket');
const logger = require('./config/logger');
const { connectRedis } = require('./config/redis');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    const server = http.createServer(app);

    // Initialize WebSocket
    initSocketIO(server);

    server.listen(PORT, () => {
      logger.info(`HRMS Backend running on port ${PORT} [${process.env.NODE_ENV}]`);
      logger.info(`API docs: http://localhost:${PORT}/api/docs`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
