'use strict';

require('express-async-errors');
const http = require('http');
const { execSync } = require('child_process');
const app = require('./app');
const { initSocketIO } = require('./config/socket');
const logger = require('./config/logger');
const { connectRedis } = require('./config/redis');

const PORT = process.env.PORT || 5000;

function killPortWin(port) {
  try {
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const lines = result.trim().split('\n');
    const pids = new Set();
    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') pids.add(pid);
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { encoding: 'utf8' });
        logger.info(`Killed process ${pid} occupying port ${port}`);
      } catch { /* already gone */ }
    }
    return pids.size > 0;
  } catch {
    return false;
  }
}

async function startServer(retries = 2) {
  try {
    await connectRedis();
    logger.info('Redis connected successfully');

    const server = http.createServer(app);
    initSocketIO(server);

    await new Promise((resolve, reject) => {
      server.listen(PORT, () => {
        logger.info(`HRMS Backend running on port ${PORT} [${process.env.NODE_ENV}]`);
        logger.info(`API docs: http://localhost:${PORT}/api/docs`);
        resolve();
      });

      server.on('error', async (err) => {
        if (err.code === 'EADDRINUSE' && retries > 0) {
          logger.warn(`Port ${PORT} in use — attempting to free it...`);
          const killed = killPortWin(PORT);
          if (killed) {
            server.close();
            setTimeout(() => startServer(retries - 1), 1500);
          } else {
            logger.error(`Could not free port ${PORT}. Please close the other process manually.`);
            process.exit(1);
          }
          reject(new Error('RETRY'));
        } else {
          logger.error(`Port ${PORT} in use and could not be freed. Exiting.`);
          process.exit(1);
        }
      });
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`${signal} received — shutting down`);
      server.close(() => process.exit(0));
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (error) {
    if (error.message !== 'RETRY') {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

startServer();
