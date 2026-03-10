const { createClient } = require('redis');
const logger = require('../utils/logger');

class RedisClient {
  constructor(config = {}) {
    this.config = {
      port: config.port || 6379,
      host: config.host || 'localhost',
      password: config.password || '',
      ttl: config.ttl || 86400, // 默认1天过期
    };
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = createClient({
        url: `redis://${this.config.host}:${this.config.port}`,
        password: this.config.password,
      });

      this.client.on('error', (err) => {
        logger.error(`Redis error: ${err.message}`);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
        this.isConnected = true;
      });

      await this.client.connect();
      logger.info('Redis connection established');
    } catch (error) {
      logger.error(`Failed to connect to Redis: ${error.message}`);
      this.isConnected = false;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.disconnect();
        logger.info('Redis disconnected');
        this.isConnected = false;
      } catch (error) {
        logger.error(`Failed to disconnect from Redis: ${error.message}`);
      }
    }
  }

  async get(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis get error: ${error.message}`);
      return null;
    }
  }

  async set(key, value, ttl = this.config.ttl) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      await this.client.set(key, JSON.stringify(value), {
        EX: ttl,
      });
      return true;
    } catch (error) {
      logger.error(`Redis set error: ${error.message}`);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis del error: ${error.message}`);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      logger.error(`Redis exists error: ${error.message}`);
      return false;
    }
  }

  // 生成缓存键
  generateKey(prefix, ...args) {
    return `${prefix}:${args.join(':')}`;
  }
}

module.exports = RedisClient;
