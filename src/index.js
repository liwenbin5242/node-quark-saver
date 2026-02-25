const express = require('express');
const QuarkClient = require('./core/quarkClient');
const URLParser = require('./utils/urlParser');
const logger = require('./utils/logger');
const { Config } = require('./config/config');
const { QuarkError } = require('./errors');

const app = express();
const PORT = process.env.PORT || 3000;

// 解析JSON请求体
app.use(express.json());

// 请求日志中间件
app.use((req, res, next) => {
  logger.info(`[${req.method}] ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    // 隐藏cookie详情，只记录是否存在
    const logBody = { ...req.body };
    if (logBody.cookie) {
      logBody.cookie = '***[隐藏]***';
    }
    logger.debug(`请求参数: ${JSON.stringify(logBody)}`);
  }
  next();
});

// 统一响应格式函数
function sendResponse(res, statusCode, success, data, error = null) {
  return res.status(statusCode).json({
    success,
    error,
    data
  });
}

// 转存API接口
app.post('/api/transfer', async (req, res) => {
  try {
    const { cookie,  url } = req.body;
    const path = '/我的高考文件/志愿填报专属资料包'
    // 验证必填参数
    if (!cookie || !url) {
      return sendResponse(res, 400, false, null, '缺少必填参数: cookie和url');
    }
    
    logger.info('开始执行转存任务');
    
    // 验证URL
    const urlValidation = URLParser.validateShareURL(url);
    if (!urlValidation.valid) {
      logger.error(`无效的分享链接: ${urlValidation.error}`);
      return sendResponse(res, 400, false, null, `无效的分享链接: ${urlValidation.error}`);
    }
    
    // 初始化配置
    const config = new Config();
    
    // 创建客户端
    const client = new QuarkClient(cookie, config.getAll());
    
    // 初始化账号
    await client.init();
    
    // 执行转存
    const result = await client.transferFile(url, path);
    
    logger.info('转存任务执行完成');
    logger.info(`成功转存 ${result.fileCount} 个文件`);

    const transferResult = await client.waitForTransferCompletion(result.taskId);
    // 通过api获取转存结果的文件名称

    const savedFids = transferResult.save_as.save_as_top_fids;
    // 获取 最近转存文件列表根据fis找出对应文件
    const recentFiles = await client.getRecentTransferredFiles();
    result.files[0].name = recentFiles.find(recentFile => recentFile.fid === savedFids[0]).name;
    result.files[0].fid = savedFids[0];
    logger.info(`最近转存文件列表获取成功，共 ${recentFiles.length} 个文件`);
    
    // 生成分享链接
    logger.info('开始生成分享链接');
    const shareLinks = await client.createShareLinksForSavedFiles(result.files, path);
    logger.info(`成功生成 ${shareLinks.length} 个分享链接`);
    
    // 构建响应数据
    const responseData = {
      shareLink: shareLinks[0].shareUrl,
      name: result.files[0].name,
    };
    
    return sendResponse(res, 200, true, responseData);
  } catch (error) {
    logger.error(`转存失败: ${error.message}`);
    if (error instanceof QuarkError) {
      logger.debug(`错误详情: ${JSON.stringify(error.details)}`);
    }
    
    // 根据错误类型返回不同的状态码
    const statusCode = error instanceof QuarkError ? 400 : 500;
    return sendResponse(res, statusCode, false, null, `转存失败: ${error.message}`);
  }
});

// 健康检查接口
app.get('/health', (req, res) => {
  return sendResponse(res, 200, true, { message: '服务运行正常' });
});

// 404处理
app.use((req, res) => {
  return sendResponse(res, 404, false, null, '接口不存在');
});

// 全局错误处理
app.use((err, req, res, next) => {
  logger.error(`全局错误: ${err.message}`);
  logger.debug(err.stack);
  return sendResponse(res, 500, false, null, '服务器内部错误');
});

// 辅助函数：格式化文件大小
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 启动服务器
app.listen(PORT, () => {
  logger.info(`服务启动成功，监听端口 ${PORT}`);
  logger.info(`转存API接口: POST http://localhost:${PORT}/api/transfer`);
  logger.info(`健康检查接口: GET http://localhost:${PORT}/health`);
});

module.exports = app;
     