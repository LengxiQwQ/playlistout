import { describe, it, expect } from 'vitest';
import { parseUserAgent, classifyBrowser, classifyDeviceBrand, extractAndroidModel } from './ua-parser';

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

    it('identifies WeChat and Chinese mobile/OEM browsers', () => {
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 MicroMessenger/8.0.40').browserFamily).toBe('wechat');
      expect(parseUserAgent('Mozilla/5.0 (Linux; U; Android 13; zh-CN) Quark/6.5.0').browserFamily).toBe('quark');
      expect(parseUserAgent('Mozilla/5.0 (Linux; U; Android 12) UCBrowser/13.4.0.1300').browserFamily).toBe('uc');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13) MQQBrowser/14.2').browserFamily).toBe('qqbrowser');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13) baiduboxapp/13.29').browserFamily).toBe('baidu');
      expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0) QIHU 360SE').browserFamily).toBe('360');
      expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0) SogouMSE').browserFamily).toBe('sogou');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13; SM-S918B) SamsungBrowser/21.0').browserFamily).toBe('samsung_browser');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14; 23116PN5BC) MiuiBrowser/17.8').browserFamily).toBe('miui_browser');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 12; NOH-AN01) HuaweiBrowser/14.0').browserFamily).toBe('huawei_browser');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13; PHT110) HeyTapBrowser/45.9').browserFamily).toBe('oppo_browser');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14; V2307A) VivoBrowser/18.5').browserFamily).toBe('vivo_browser');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13; PGT-AN10) HonorBrowser/5.0').browserFamily).toBe('honor_browser');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13) Via/4.4.2').browserFamily).toBe('via');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13) XBrowser/4.0.0').browserFamily).toBe('xbrowser');
    });

    it('dynamically extracts unlisted custom browsers', () => {
      expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Waterfox/115.0').browserFamily).toBe('waterfox');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/116.0 Mobile Safari/537.36 AlohaBrowser/5.0').browserFamily).toBe('alohabrowser');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/116.0 Mobile Safari/537.36 Kiwi/116.0').browserFamily).toBe('kiwi');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 SoulBrowser/1.4.1').browserFamily).toBe('soulbrowser');
    });

    it('returns bot_crawler for bots and automated tools', () => {
      expect(parseUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)').browserFamily).toBe('bot_crawler');
      expect(parseUserAgent('curl/7.68.0').browserFamily).toBe('bot_crawler');
      expect(parseUserAgent('python-requests/2.31.0').browserFamily).toBe('bot_crawler');
    });

    it('returns other for completely unknown strings without product pattern', () => {
      expect(parseUserAgent('unknown-client-no-token').browserFamily).toBe('other');
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

  describe('Hardware & Mobile Brand classification', () => {
    it('identifies Apple devices', () => {
      expect(parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15').deviceBrand).toBe('Apple iPhone');
      expect(parseUserAgent('Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15').deviceBrand).toBe('Apple iPad');
      expect(parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15').deviceBrand).toBe('Apple Mac');
    });

    it('identifies Huawei and Honor devices', () => {
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 12; NOH-AN01 Build/HUAWEINOH-AN01; HarmonyOS) AppleWebKit/537.36').deviceBrand).toBe('Huawei (华为)');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13; PGT-AN10 Build/HONORPGT-AN10) AppleWebKit/537.36').deviceBrand).toBe('Honor (荣耀)');
    });

    it('identifies Xiaomi and Redmi devices', () => {
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14; 23116PN5BC Build/UKQ1.230804.001) AppleWebKit/537.36').deviceBrand).toBe('Xiaomi (小米/红米)');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13; Redmi K60) AppleWebKit/537.36').deviceBrand).toBe('Xiaomi (小米/红米)');
    });

    it('identifies OPPO, OnePlus, and Realme devices', () => {
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14; PHT110 Build/UP1A) AppleWebKit/537.36').deviceBrand).toBe('OPPO');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14; PJD110 Build/UP1A; OnePlus 12) AppleWebKit/537.36').deviceBrand).toBe('OnePlus (一加)');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13; RMX3708 Build/TP1A) AppleWebKit/537.36').deviceBrand).toBe('Realme (真我)');
    });

    it('identifies vivo and iQOO devices', () => {
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14; V2307A Build/UP1A; vivo X100) AppleWebKit/537.36').deviceBrand).toBe('vivo');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14; V2324A Build/UP1A; iQOO 12) AppleWebKit/537.36').deviceBrand).toBe('iQOO');
    });

    it('identifies Samsung and other major brands', () => {
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13; SM-S918B Build/TP1A) AppleWebKit/537.36').deviceBrand).toBe('Samsung (三星)');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro Build/UD1A) AppleWebKit/537.36').deviceBrand).toBe('Google Pixel');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13; Meizu 20 Pro Build/TKQ1) AppleWebKit/537.36').deviceBrand).toBe('Meizu (魅族)');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13; XQ-DQ72) Sony Xperia 1 V').deviceBrand).toBe('Sony (索尼)');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 13; Lenovo TB-J606F Build/RKQ1) AppleWebKit/537.36').deviceBrand).toBe('Lenovo (联想)');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 14; ASUS_AI2202 Build/UKQ1) AppleWebKit/537.36').deviceBrand).toBe('ASUS (华硕)');
    });

    it('dynamically extracts unlisted brand-new Android models', () => {
      // Dynamic fallback extracts exact hardware model name from Android UA
      expect(parseUserAgent('Mozilla/5.0 (Linux; U; Android 14; zh-cn; Fairphone 4 Build/FP4) AppleWebKit/537.36').deviceBrand).toBe('Android: Fairphone 4');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 11; Smartisan Nut Pro 3 Build/RD2001) AppleWebKit/537.36').deviceBrand).toBe('Android: Smartisan Nut Pro 3');
      expect(parseUserAgent('Mozilla/5.0 (Linux; Android 12; CustomBrand-X100 Build/SP1A) AppleWebKit/537.36').deviceBrand).toBe('Android: CustomBrand-X100');
    });

    it('identifies desktop operating systems as hardware brands', () => {
      expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36').deviceBrand).toBe('Windows PC');
      expect(parseUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36').deviceBrand).toBe('Linux PC');
    });
  });
});
