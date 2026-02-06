

const DEFAULT_CONFIG = {
  baseUrl: 'https://drive-pc.quark.cn',
  baseUrlApp: 'https://drive-m.quark.cn',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/3.14.2 Chrome/112.0.5615.165 Electron/24.1.3.8 Safari/537.36 Channel/pckk_other_ch',
  timeout: 30000,
  retryCount: 3,
  maxConcurrentTasks: 5,
  defaultSavePath: '/',
  logLevel: 'info'
};

class Config {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
  }

  getAll() {
    return this.config;
  }
}

module.exports = {
  Config,
  DEFAULT_CONFIG
};