const axios = require('axios');
const logger = require('../utils/logger');
const { NetworkError, RateLimitError } = require('../errors');

class HTTPClient {
  constructor(config = {}) {
    this.config = {
      timeout: config.timeout || 30000,
      retryCount: config.retryCount || 3,
      retryDelay: config.retryDelay || 1000
    };

    this.client = axios.create({
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      config => {
        logger.debug(`发送请求: ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      response => {
        logger.debug(`收到响应: ${response.status} ${response.config.url}`);
        return response;
      },
      error => {
        if (error.response) {
          logger.warn(`请求失败: ${error.response.status} ${error.config.url}`);
          
          // 处理429速率限制
          if (error.response.status === 429) {
            return Promise.reject(new RateLimitError('请求过于频繁，请稍后再试', {
              status: error.response.status,
              headers: error.response.headers
            }));
          }
        } else if (error.request) {
          logger.error('网络错误: 无法连接到服务器');
          return Promise.reject(new NetworkError('网络错误: 无法连接到服务器', {
            request: error.request
          }));
        }
        return Promise.reject(error);
      }
    );
  }

  async request(method, url, options = {}) {
    let attempt = 0;
    
    while (attempt <= this.config.retryCount) {
      try {
        const response = await this.client({
          method,
          url,
          ...options
        });
        return response.data;
      } catch (error) {
        attempt++;
        
        // 如果是速率限制错误，直接抛出
        if (error instanceof RateLimitError) {
          throw error;
        }
        
        // 如果是网络错误且还有重试次数，等待后重试
        if (error instanceof NetworkError && attempt <= this.config.retryCount) {
          logger.warn(`请求失败，正在重试 (${attempt}/${this.config.retryCount})...`);
          await this.sleep(this.config.retryDelay * attempt);
          continue;
        }
        
        // 其他错误直接抛出
        throw error;
      }
    }
  }

  async get(url, params = {}, headers = {}) {
    return this.request('get', url, { params, headers });
  }

  async post(url, data = {}, params = {}, headers = {}) {
    return this.request('post', url, { data, params, headers });
  }

  async put(url, data = {}, params = {}, headers = {}) {
    return this.request('put', url, { data, params, headers });
  }

  async delete(url, params = {}, headers = {}) {
    return this.request('delete', url, { params, headers });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = HTTPClient;