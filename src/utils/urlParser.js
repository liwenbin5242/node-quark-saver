const { InvalidURLError } = require('../errors');

class URLParser {
  static parseShareURL(url) {
    try {
      const parsedUrl = new URL(url);
      
      // 验证域名是否为夸克域名
      if (!parsedUrl.hostname.includes('quark.cn')) {
        throw new InvalidURLError('无效的夸克分享链接：域名不是夸克域名');
      }
      
      // 提取 pwd_id
      let pwdId = null;
      const pathMatch = parsedUrl.pathname.match(/\/s\/(\w+)/);
      if (pathMatch) {
        pwdId = pathMatch[1];
      }
      
      // 提取 passcode
      let passcode = '';
      const searchParams = new URLSearchParams(parsedUrl.search);
      if (searchParams.has('pwd')) {
        passcode = searchParams.get('pwd');
      }
      
      // 提取路径信息
      const paths = [];
      const pathRegex = /\/(\w{32})-?([^/]+)?/g;
      let match;
      while ((match = pathRegex.exec(parsedUrl.href)) !== null) {
        const fid = match[1];
        const name = decodeURIComponent(match[2] || '').replace('*101', '-');
        paths.push({ fid, name });
      }
      
      // 提取 pdir_fid
      const pdirFid = paths.length > 0 ? paths[paths.length - 1].fid : '0';
      
      if (!pwdId) {
        throw new InvalidURLError('无效的夸克分享链接：无法提取 pwd_id');
      }
      
      return {
        pwdId,
        passcode,
        pdirFid,
        paths
      };
    } catch (error) {
      if (error instanceof InvalidURLError) {
        throw error;
      }
      throw new InvalidURLError(`URL解析失败：${error.message}`, { originalError: error.message });
    }
  }

  static validateShareURL(url) {
    try {
      const result = this.parseShareURL(url);
      return {
        valid: true,
        data: result
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  static extractFidFromPath(path) {
    const match = path.match(/\/(\w{32})/);
    return match ? match[1] : null;
  }
}

module.exports = URLParser;