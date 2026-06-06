'use strict';

const logger = require('./logger');

// In-memory fallback when Redis is not configured
const memStore = new Map();

let redisClient = null;
let useMemory = true;

const connectRedis = async () => {
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not set — using in-memory cache (not suitable for production)');
    return;
  }

  try {
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 1000)),
      lazyConnect: true,
      connectTimeout: 5000,
    });

    redisClient.on('error', (err) => {
      logger.warn(`Redis error (falling back to memory): ${err.message}`);
      redisClient = null;
      useMemory = true;
    });

    await redisClient.connect();
    useMemory = false;
    logger.info('Redis connected');
  } catch (err) {
    logger.warn(`Redis unavailable (${err.message}) — using in-memory cache`);
    redisClient = null;
    useMemory = true;
  }
};

const getRedis = () => redisClient;

const cache = {
  async get(key) {
    if (useMemory || !redisClient) {
      const entry = memStore.get(key);
      if (!entry) return null;
      if (entry.expiry && entry.expiry < Date.now()) { memStore.delete(key); return null; }
      return entry.value;
    }
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },

  async set(key, value, ttlSeconds = 300) {
    if (useMemory || !redisClient) {
      memStore.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
      return;
    }
    try { await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds); } catch { /* ignore */ }
  },

  async del(key) {
    if (useMemory || !redisClient) { memStore.delete(key); return; }
    try { await redisClient.del(key); } catch { /* ignore */ }
  },

  async delPattern(pattern) {
    if (useMemory || !redisClient) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      for (const k of memStore.keys()) { if (regex.test(k)) memStore.delete(k); }
      return;
    }
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) await redisClient.del(...keys);
    } catch { /* ignore */ }
  },

  async exists(key) {
    if (useMemory || !redisClient) {
      const entry = memStore.get(key);
      if (!entry) return false;
      if (entry.expiry && entry.expiry < Date.now()) { memStore.delete(key); return false; }
      return true;
    }
    try { return (await redisClient.exists(key)) === 1; } catch { return false; }
  },
};

module.exports = { connectRedis, getRedis, cache };
