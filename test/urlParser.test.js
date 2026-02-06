const URLParser = require('../src/utils/urlParser');

describe('URLParser', () => {
  describe('parseShareURL', () => {
    test('should parse valid share URL', () => {
      const url = 'https://pan.quark.cn/s/123456?pwd=abc';
      const result = URLParser.parseShareURL(url);
      
      expect(result).toHaveProperty('pwdId');
      expect(result).toHaveProperty('passcode');
      expect(result).toHaveProperty('pdirFid');
      expect(result).toHaveProperty('paths');
      expect(result.pwdId).toBe('123456');
      expect(result.passcode).toBe('abc');
      expect(result.pdirFid).toBe('0');
      expect(Array.isArray(result.paths)).toBe(true);
    });

    test('should parse URL with path information', () => {
      const url = 'https://pan.quark.cn/s/123456#/list/share/7e25ddd87cf64443b637125478733295-夸克自动转存测试';
      const result = URLParser.parseShareURL(url);
      
      expect(result.pwdId).toBe('123456');
      expect(result.passcode).toBe('');
      expect(result.paths.length).toBeGreaterThan(0);
    });

    test('should throw error for invalid URL', () => {
      const invalidUrl = 'https://example.com/s/123456';
      expect(() => {
        URLParser.parseShareURL(invalidUrl);
      }).toThrow();
    });
  });

  describe('validateShareURL', () => {
    test('should return valid for correct URL', () => {
      const url = 'https://pan.quark.cn/s/123456';
      const result = URLParser.validateShareURL(url);
      
      expect(result.valid).toBe(true);
      expect(result.data).toHaveProperty('pwdId');
    });

    test('should return invalid for incorrect URL', () => {
      const url = 'https://example.com/s/123456';
      const result = URLParser.validateShareURL(url);
      
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('extractFidFromPath', () => {
    test('should extract fid from path', () => {
      const path = '/7e25ddd87cf64443b637125478733295-夸克自动转存测试';
      const fid = URLParser.extractFidFromPath(path);
      
      expect(fid).toBe('7e25ddd87cf64443b637125478733295');
    });

    test('should return null for path without fid', () => {
      const path = '/夸克自动转存测试';
      const fid = URLParser.extractFidFromPath(path);
      
      expect(fid).toBeNull();
    });
  });
});
