import { describe, it, expect } from 'vitest';
import { parseUserAgent } from './ua-parser';

describe('Coarse User-Agent Parser', () => {
  describe('device classification', () => {
    it('classifies desktop browsers', () => {
      expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36').deviceClass).toBe('desktop');
      expect(parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15').deviceClass).toBe('desktop');
    });

    it('classifies mobile devices', () => {
      expect(parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148').deviceClass).toBe('mobile');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36').deviceClass).toBe('mobile');
    });

    it('classifies tablets', () => {
      expect(parseUserAgent('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Safari/605.1.15').deviceClass).toBe('tablet');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 12; SM-T870) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36').deviceClass).toBe('tablet');
    });

    it('defaults to desktop for null/empty UA', () => {
      expect(parseUserAgent(null).deviceClass).toBe('desktop');
      expect(parseUserAgent('').deviceClass).toBe('desktop');
    });
  });

  describe('browser classification', () => {
    it('identifies Chrome', () => {
      expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36').browserFamily).toBe('chrome');
    });

    it('identifies Firefox', () => {
      expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/121.0').browserFamily).toBe('firefox');
    });

    it('identifies Safari (not Chrome)', () => {
      expect(parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15').browserFamily).toBe('safari');
    });

    it('identifies Edge', () => {
      expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0').browserFamily).toBe('edge');
    });

    it('identifies WeChat and Chinese mobile browsers', () => {
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 MicroMessenger/8.0.40').browserFamily).toBe('wechat');
      expect(parseUserAgent('Mozilla/5.0 (Linux; U; Android 13; zh-CN) Quark/6.5.0').browserFamily).toBe('quark');
    });

    it('returns bot_crawler for bots and automated tools', () => {
      expect(parseUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)').browserFamily).toBe('bot_crawler');
      expect(parseUserAgent('curl/7.68.0').browserFamily).toBe('bot_crawler');
      expect(parseUserAgent('CustomUnknownBrowser/1.0').browserFamily).toBe('other');
    });
  });


  describe('OS classification', () => {
    it('identifies Windows', () => {
      expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0').osFamily).toBe('windows');
    });

    it('identifies macOS', () => {
      expect(parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15').osFamily).toBe('macos');
    });

    it('identifies Linux', () => {
      expect(parseUserAgent('Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0').osFamily).toBe('linux');
    });

    it('identifies Android', () => {
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/120.0.0.0 Mobile').osFamily).toBe('android');
    });

    it('identifies iOS', () => {
      expect(parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) Safari/605.1.15').osFamily).toBe('ios');
    });

    it('returns other for unknown OS', () => {
      expect(parseUserAgent('curl/7.68.0').osFamily).toBe('other');
    });
  });
});
