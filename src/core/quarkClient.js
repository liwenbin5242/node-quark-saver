const HTTPClient = require('../services/httpClient');
const URLParser = require('../utils/urlParser');
const logger = require('../utils/logger');
const { AuthenticationError, TransferError, FileNotFoundError } = require('../errors');

class QuarkClient {
  constructor(cookie, config = {}) {
    this.cookie = cookie;
    this.config = {
      baseUrl: config.baseUrl || 'https://drive-pc.quark.cn',
      baseUrlApp: config.baseUrlApp || 'https://drive-m.quark.cn',
      userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/3.14.2 Chrome/112.0.5615.165 Electron/24.1.3.8 Safari/537.36 Channel/pckk_other_ch'
    };
    this.httpClient = new HTTPClient(config);
    this.mparam = this.extractMParam(cookie);
    this.isActive = false;
    this.nickname = '';
  }

  extractMParam(cookie) {
    const mparam = {};
    const kpsMatch = cookie.match(/kps=([a-zA-Z0-9%+/=]+)[;&]?/);
    const signMatch = cookie.match(/sign=([a-zA-Z0-9%+/=]+)[;&]?/);
    const vcodeMatch = cookie.match(/vcode=([a-zA-Z0-9%+/=]+)[;&]?/);

    if (kpsMatch && signMatch && vcodeMatch) {
      mparam.kps = kpsMatch[1].replace(/%25/g, '%');
      mparam.sign = signMatch[1].replace(/%25/g, '%');
      mparam.vcode = vcodeMatch[1].replace(/%25/g, '%');
    }
    return mparam;
  }

  getHeaders() {
    return {
      'Cookie': this.cookie,
      'User-Agent': this.config.userAgent,
      'Content-Type': 'application/json'
    };
  }

  async init() {
    try {
      const accountInfo = await this.getAccountInfo();
      if (accountInfo) {
        this.isActive = true;
        this.nickname = accountInfo.nickname;
        logger.info(`账号登录成功: ${this.nickname}`);
        return accountInfo;
      }
      return false;
    } catch (error) {
      logger.error(`账号初始化失败: ${error.message}`);
      throw new AuthenticationError(`账号初始化失败: ${error.message}`);
    }
  }

  async getAccountInfo() {
    const url = 'https://pan.quark.cn/account/info';
    const params = { fr: 'pc', platform: 'pc' };
    const headers = this.getHeaders();

    try {
      const response = await this.httpClient.get(url, params, headers);
      if (response.data) {
        return response.data;
      }
      return false;
    } catch (error) {
      throw new AuthenticationError('获取账号信息失败', { error: error.message });
    }
  }

  async getStoken(pwdId, passcode = '') {
    const url = `${this.config.baseUrl}/1/clouddrive/share/sharepage/token`;
    const params = { pr: 'ucpro', fr: 'pc' };
    const data = { pwd_id: pwdId, passcode };
    const headers = this.getHeaders();

    try {
      const response = await this.httpClient.post(url, data, params, headers);
      if (response.code === 0 && response.data) {
        return response.data.stoken;
      }
      throw new TransferError(`获取stoken失败: ${response.message || '未知错误'}`);
    } catch (error) {
      if (error instanceof TransferError) {
        throw error;
      }
      throw new TransferError(`获取stoken失败: ${error.message}`);
    }
  }

  async getFileDetail(pwdId, stoken, pdirFid, options = {}) {
    const { _fetch_share = 0, fetch_share_full_path = 0, pageSize = 50 } = options;
    const listMerge = [];
    let page = 1;

    let hasMore = true;
    while (hasMore) {
      const url = `${this.config.baseUrl}/1/clouddrive/share/sharepage/detail`;
      const params = {
        pr: 'ucpro',
        fr: 'pc',
        pwd_id: pwdId,
        stoken,
        pdir_fid: pdirFid,
        force: '0',
        _page: page,
        _size: pageSize,
        _fetch_banner: '0',
        _fetch_share,
        _fetch_total: '1',
        _sort: 'file_type:asc,updated_at:desc',
        ver: '2',
        fetch_share_full_path
      };
      const headers = this.getHeaders();

      try {
        const response = await this.httpClient.get(url, params, headers);
        if (response.code !== 0) {
          throw new TransferError(`获取文件详情失败: ${response.message || '未知错误'}`);
        }

        const fileList = response.data.list || [];
        if (fileList.length === 0) {
          hasMore = false;
        }

        listMerge.push(...fileList);
        page++;

        if (listMerge.length >= response.metadata._total) {
          hasMore = false;
        }
      } catch (error) {
        throw new TransferError(`获取文件详情失败: ${error.message}`);
      }
    }

    return listMerge;
  }

  async saveFile(fidList, fidTokenList, toPdirFid, pwdId, stoken) {
    const url = `${this.config.baseUrl}/1/clouddrive/share/sharepage/save`;
    const params = {
      pr: 'ucpro',
      fr: 'pc',
      uc_param_str: '',
      app: 'clouddrive',
      __dt: Math.floor(Math.random() * 4 + 1) * 60 * 1000,
      __t: Date.now()
    };
    const data = {
      fid_list: fidList,
      fid_token_list: fidTokenList,
      to_pdir_fid: toPdirFid,
      pwd_id: pwdId,
      stoken,
      pdir_fid: '0',
      scene: 'link'
    };
    const headers = this.getHeaders();

    try {
      const response = await this.httpClient.post(url, data, params, headers);
      if (response.code === 0 && response.data) {
        return response.data.task_id;
      }
      throw new TransferError(`转存文件失败: ${response.message || '未知错误'}`);
    } catch (error) {
      if (error instanceof TransferError) {
        throw error;
      }
      throw new TransferError(`转存文件失败: ${error.message}`);
    }
  }

  async queryTask(taskId) {
    let retryIndex = 0;
    let isCompleted = false;

    while (!isCompleted) {
      const url = `${this.config.baseUrl}/1/clouddrive/task`;
      const params = {
        pr: 'ucpro',
        fr: 'pc',
        uc_param_str: '',
        task_id: taskId,
        retry_index: retryIndex,
        __dt: Math.floor(Math.random() * 4 + 1) * 60 * 1000,
        __t: Date.now()
      };
      const headers = this.getHeaders();

      try {
        const response = await this.httpClient.get(url, params, headers);
        if (response.status !== 200) {
          throw new TransferError(`查询任务失败: ${response.message || '未知错误'}`);
        }

        const taskStatus = response.data.status;
        if (taskStatus === 2) {
          isCompleted = true;
          if (response.code === 0 && response.data) {
            return response.data;
          }
          throw new TransferError(`转存任务失败: ${response.message || '未知错误'}`);
        }

        if (retryIndex === 0) {
          logger.info('正在等待转存完成...');
        } else if (retryIndex % 5 === 0) {
          logger.info(`转存中... (${retryIndex}s)`);
        }

        retryIndex++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        throw new TransferError(`查询任务失败: ${error.message}`);
      }
    }
  }

  async waitForTransferCompletion(taskId) {
    let result = { status: 0 };
    while (result.status !== 2) {
      try {
        logger.info(`开始等待转存完成，任务ID: ${taskId}`);
        result = await this.queryTask(taskId);
        logger.info('转存完成查询成功');
        if(result.status === 2) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`等待转存完成失败: ${error.message}`);
        throw error;
      }
    }
  }

  async getFids(filePaths) {
    const fids = [];
    let remainingPaths = [...filePaths];

    while (remainingPaths.length > 0) {
      const batchPaths = remainingPaths.splice(0, 50);
      const url = `${this.config.baseUrl}/1/clouddrive/file/info/path_list`;
      const params = { pr: 'ucpro', fr: 'pc' };
      const data = { file_path: batchPaths, namespace: '0' };
      const headers = this.getHeaders();

      try {
        const response = await this.httpClient.post(url, data, params, headers);
        if (response.code === 0 && response.data) {
          fids.push(...response.data);
        } else {
          throw new TransferError(`获取目录ID失败: ${response.message || '未知错误'}`);
        }
      } catch (error) {
        throw new TransferError(`获取目录ID失败: ${error.message}`);
      }
    }

    return fids;
  }

  async mkdir(dirPath) {
    const url = `${this.config.baseUrl}/1/clouddrive/file`;
    const params = { pr: 'ucpro', fr: 'pc', uc_param_str: '' };
    const data = {
      pdir_fid: '0',
      file_name: '',
      dir_path: dirPath,
      dir_init_lock: false
    };
    const headers = this.getHeaders();

    try {
      const response = await this.httpClient.post(url, data, params, headers);
      if (response.code === 0 && response.data) {
        return response.data.fid;
      }
      throw new TransferError(`创建目录失败: ${response.message || '未知错误'}`);
    } catch (error) {
      if (error instanceof TransferError) {
        throw error;
      }
      throw new TransferError(`创建目录失败: ${error.message}`);
    }
  }

  async getSavePathFid(savePath) {
    try {
      // 根目录直接返回"0"
      if (savePath === '/' || savePath === '') {
        return '0';
      }
      
      const fids = await this.getFids([savePath]);
      if (fids.length > 0) {
        return fids[0].fid;
      }
      // 目录不存在，创建目录
      return await this.mkdir(savePath);
    } catch (error) {
      throw new TransferError(`获取或创建保存路径失败: ${error.message}`);
    }
  }

  async transferFile(shareUrl, savePath) {
    try {
      // 解析分享链接
      const urlInfo = URLParser.parseShareURL(shareUrl);
      logger.info(`解析分享链接成功: pwdId=${urlInfo.pwdId}`);

      // 获取stoken
      const stoken = await this.getStoken(urlInfo.pwdId, urlInfo.passcode);
      logger.info('获取stoken成功');

      // 获取文件详情
      const fileList = await this.getFileDetail(urlInfo.pwdId, stoken, urlInfo.pdirFid);
      if (fileList.length === 0) {
        throw new FileNotFoundError('分享链接中没有文件');
      }
      logger.info(`获取文件列表成功，共 ${fileList.length} 个文件`);

      // 准备转存参数
      const fidList = fileList.map(file => file.fid);
      const fidTokenList = fileList.map(file => file.share_fid_token);

      // 获取保存路径的fid
      const toPdirFid = await this.getSavePathFid(savePath);
      logger.info(`获取保存路径ID成功: ${toPdirFid}`);

      // 分批转存，每批最多100个文件
      const batchSize = 100;
      const results = [];
      const taskIds = [];

      for (let i = 0; i < fidList.length; i += batchSize) {
        const batchFids = fidList.slice(i, i + batchSize);
        const batchTokens = fidTokenList.slice(i, i + batchSize);
        
        logger.info(`开始转存第 ${Math.floor(i / batchSize) + 1} 批文件 (${batchFids.length}个)`);
        
        // 执行转存
        const taskId = await this.saveFile(
          batchFids,
          batchTokens,
          toPdirFid,
          urlInfo.pwdId,
          stoken
        );
        taskIds.push(taskId);
        
        // 查询转存状态
        const taskResult = await this.queryTask(taskId);
        results.push(taskResult);
        
        logger.info(`第 ${Math.floor(i / batchSize) + 1} 批文件转存完成`);
      }

      return {
        success: true,
        fileCount: fileList.length,
        results,
        taskIds: taskIds,
        taskId: taskIds[taskIds.length - 1], // 返回最后一个taskId
        files: fileList.map(file => ({
          name: file.file_name,
          size: file.size,
          type: file.obj_category || 'file'
        }))
      };
    } catch (error) {
      logger.error(`转存失败: ${error.message}`);
      throw error;
    }
  }

  async queryShareTask(taskId) {
    let retryIndex = 0;
    let isCompleted = false;

    while (!isCompleted) {
      const url = `${this.config.baseUrl}/1/clouddrive/task`;
      const params = {
        pr: 'ucpro',
        fr: 'pc',
        uc_param_str: '',
        app: 'clouddrive',
        task_id: taskId,
        __t: Date.now()
      };
      const headers = this.getHeaders();

      try {
        const response = await this.httpClient.get(url, params, headers);
        if (response.code === 0 && response.data) {
          const taskStatus = response.data.status;
          if (taskStatus === 2) {
            isCompleted = true;
            return response.data;
          }
        }

        if (retryIndex === 0) {
          logger.info('正在等待分享链接生成...');
        } else if (retryIndex % 3 === 0) {
          logger.info(`分享链接生成中... (${retryIndex}s)`);
        }

        retryIndex++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        throw new TransferError(`查询分享任务失败: ${error.message}`);
      }
    }
  }

  async getShareInfo(shareId) {
    const url = `${this.config.baseUrl}/1/clouddrive/share/password?pr=ucpro&fr=pc&uc_param_str=`;
    const data = {
      share_id: shareId
    };
    const headers = this.getHeaders();

    try {
      const response = await this.httpClient.post(url, data, headers);
      if (response.code === 0 && response.data) {
        return response.data;
      }
      throw new TransferError(`获取分享信息失败: ${response.message || '未知错误'}`);
    } catch (error) {
      if (error instanceof TransferError) {
        throw error;
      }
      throw new TransferError(`获取分享信息失败: ${error.message}`);
    }
  }

  async createShareLink(fid, title) {
    const url = `${this.config.baseUrl}/1/clouddrive/share`;
    const params = {
      pr: 'ucpro',
      fr: 'pc',
      uc_param_str: ''
    };
    const data = {
      fid_list: [fid],
      expired_type: 1,
      title,
      url_type: 1
    };
    const headers = this.getHeaders();

    try {
      const response = await this.httpClient.post(url, data, params, headers);
      if (response.code === 0 && response.data) {
        // 检查是否返回了task_id
        if (response.data.task_id) {
          const taskId = response.data.task_id;
          logger.info(`获取分享任务ID成功: ${taskId}`);
          
          // 查询分享任务状态，获取share_id
          const taskResult = await this.queryShareTask(taskId);
          logger.info('查询分享任务成功');
          
          if (taskResult && taskResult.share_id) {
            const shareId = taskResult.share_id;
            logger.info(`获取分享ID成功: ${shareId}`);
            
            // 通过share_id获取分享链接
            const shareInfo = await this.getShareInfo(shareId);
            logger.info('获取分享信息成功');
            
            return {
              url: shareInfo.share_url || `https://pan.quark.cn/s/${shareId}`,
              shareId: shareId,
              expireTime: taskResult.expire_time || 0
            };
          }
          throw new TransferError('创建分享链接失败: 未获取到share_id');
        } else if (response.data.share_id) {
          // 如果直接返回了share_id，通过share_id获取分享链接
          const shareId = response.data.share_id;
          logger.info(`获取分享ID成功: ${shareId}`);
          
          // 通过share_id获取分享链接
          const shareInfo = await this.getShareInfo(shareId);
          logger.info('获取分享信息成功');
          
          return {
            url: shareInfo.share_url || `https://pan.quark.cn/s/${shareId}`,
            shareId: shareId,
            expireTime: response.data.expire_time || 0
          };
        }
        throw new TransferError('创建分享链接失败: 未获取到task_id或share_id');
      }
      throw new TransferError(`创建分享链接失败: ${response.message || '未知错误'}`);
    } catch (error) {
      if (error instanceof TransferError) {
        throw error;
      }
      throw new TransferError(`创建分享链接失败: ${error.message}`);
    }
  }

  async createShareLinksForSavedFiles(savedFiles, savePath) {
    try {
      // 获取保存路径的完整文件路径
      const shareLinks = [];
      
      for (const file of savedFiles) {
        // 构建完整的文件路径
        const filePath = savePath === '/' ? `/${file.name}` : `${savePath}/${file.name}`;
        
        // 获取文件的fid
        const fids = await this.getFids([filePath]);
        if (fids.length > 0) {
          // 创建分享链接
          const shareLink = await this.createShareLink(fids[0].fid, file.name);
          shareLinks.push({
            name: file.name,
            size: file.size,
            shareUrl: shareLink.url,
            shareId: shareLink.shareId
          });
        }
      }
      
      return shareLinks;
    } catch (error) {
      logger.error(`生成分享链接失败: ${error.message}`);
      throw error;
    }
  }
}

module.exports = QuarkClient;