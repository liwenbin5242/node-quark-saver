# Node.js 夸克文件转存工具

## 项目简介

`node-quark-saver` 是一个基于 Node.js 开发的夸克文件转存工具，支持将夸克网盘的分享文件快速转存到自己的夸克网盘中。

## 功能特性

- ✅ 支持解析各种格式的夸克分享链接
- ✅ 自动处理分享密码验证
- ✅ 批量转存文件（每批最多100个）
- ✅ 实时转存状态跟踪
- ✅ 完善的错误处理机制
- ✅ 支持命令行操作
- ✅ 详细的日志记录

## 技术架构

### 核心模块

- **core/quarkClient.js**: 核心转存逻辑，处理与夸克API的交互
- **utils/urlParser.js**: URL解析器，提取分享链接中的参数
- **services/httpClient.js**: HTTP客户端，处理网络请求
- **config/config.js**: 配置管理
- **errors/index.js**: 错误处理
- **utils/logger.js**: 日志记录

### 技术栈

- Node.js 14+
- axios: HTTP请求
- commander: 命令行参数解析
- winston: 日志管理

## 安装

### 1. 克隆项目

```bash
git clone https://github.com/your-repo/node-quark-saver.git
cd node-quark-saver
```

### 2. 安装依赖

```bash
npm install
```

## 使用方法

### 1. 获取夸克账号Cookie

1. 打开浏览器，登录夸克网盘
2. 按 F12 打开开发者工具
3. 切换到 Network 标签
4. 刷新页面，找到一个请求
5. 在 Request Headers 中复制完整的 Cookie 值

### 2. 命令行使用

#### 转存文件

```bash
npm start transfer -- --url "夸克分享链接" --path "保存路径" --cookie "你的cookie"
```

**示例：**

```bash
npm start transfer -- --url "https://pan.quark.cn/s/123456" --path "/我的文件" --cookie "你的完整cookie"
```

#### 验证分享链接

```bash
npm start validate -- --url "夸克分享链接"
```

#### 获取账号信息

```bash
npm start account -- --cookie "你的cookie"
```

## 配置说明

默认配置位于 `src/config/config.js`，可根据需要修改：

- **baseUrl**: 夸克PC端API地址
- **baseUrlApp**: 夸克移动端API地址
- **userAgent**: 浏览器UA
- **timeout**: 请求超时时间（毫秒）
- **retryCount**: 重试次数
- **maxConcurrentTasks**: 最大并发任务数
- **defaultSavePath**: 默认保存路径
- **logLevel**: 日志级别

## 错误处理

工具会自动处理以下错误：

- **认证错误**: Cookie无效或已过期
- **网络错误**: 网络连接失败
- **无效链接**: 分享链接格式错误
- **转存错误**: 转存过程中出现的错误
- **文件不存在**: 分享链接中没有文件
- **速率限制**: 请求过于频繁

## 日志记录

日志文件保存在 `logs/` 目录：

- **combined.log**: 所有日志
- **error.log**: 错误日志

## 测试用例

### 基本功能测试

1. **链接验证测试**
   ```bash
   npm start validate -- --url "https://pan.quark.cn/s/123456"
   ```

2. **账号信息测试**
   ```bash
   npm start account -- --cookie "你的cookie"
   ```

3. **转存功能测试**
   ```bash
   npm start transfer -- --url "https://pan.quark.cn/s/123456" --path "/测试" --cookie "你的cookie"
   ```

### 边界情况测试

- **无效链接测试**: 使用格式错误的链接
- **无权限测试**: 使用已失效的分享链接
- **网络异常测试**: 在网络不稳定的环境下测试
- **批量文件测试**: 测试转存大量文件

## 最佳实践

1. **Cookie管理**
   - 定期更新Cookie以避免过期
   - 不要在代码中硬编码Cookie
   - 考虑使用环境变量存储Cookie

2. **性能优化**
   - 对于大量文件，使用分批转存
   - 合理设置重试次数和超时时间
   - 避免频繁请求同一链接

3. **安全性**
   - 不要分享包含Cookie的代码
   - 定期检查账号安全
   - 遵循夸克API使用规范

## 常见问题

### Q: 转存失败，提示"认证错误"

**A:** 请检查Cookie是否正确，是否已过期。建议重新获取Cookie后再试。

### Q: 转存失败，提示"请求过于频繁"

**A:** 夸克API有速率限制，请稍后再试，或减少单次转存的文件数量。

### Q: 链接验证失败

**A:** 请检查分享链接格式是否正确，确保包含完整的分享地址。

### Q: 转存后文件在哪里？

**A:** 文件会保存在你指定的路径中，默认保存在根目录。

## 注意事项

1. 本工具仅供个人使用，请勿用于商业用途
2. 请遵守夸克网盘的使用条款
3. 合理使用API，避免过度请求导致账号受限
4. 本工具不存储任何用户数据，所有操作均在本地执行

## 许可证

MIT License
