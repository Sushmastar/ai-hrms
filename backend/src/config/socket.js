'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io;

const initSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
      credentials: true,
    },
    pingTimeout: 60000,
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication token required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user || {};
    logger.info(`WS connect: user=${userId} role=${role}`);
    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);

    socket.on('disconnect', () => {
      logger.info(`WS disconnect: user=${userId}`);
    });
  });

  return io;
};

const getIO = () => io;

const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

const emitToRole = (role, event, data) => {
  if (io) io.to(`role:${role}`).emit(event, data);
};

module.exports = { initSocketIO, getIO, emitToUser, emitToRole };
