/**
 * Lightweight Coarse User-Agent Parser & Device Brand Classifier
 *
 * Extracts device_class, browser_family, os_family, and device_brand from the User-Agent header.
 * No npm dependencies — uses fast regex matching for major browsers, engines, and mobile brands.
 *
 * PRIVACY: The full User-Agent string is NEVER stored.
 * Only coarse parsed categories (e.g. 'Xiaomi', 'Chrome') are written to analytics.
 */

import type { DeviceClass, BrowserFamily, OsFamily } from './types';

export interface ParsedUA {
  deviceClass: DeviceClass;
  browserFamily: BrowserFamily;
  osFamily: OsFamily;
  deviceBrand: string;
}

/**
 * Parses a User-Agent string into coarse device, browser, OS, and device brand categories.
 * Returns safe defaults for missing or unparseable input.
 */
export function parseUserAgent(ua: string | null): ParsedUA {
  if (!ua) {
    return { deviceClass: 'desktop', browserFamily: 'other', osFamily: 'other', deviceBrand: 'Other' };
  }

  const lowerUA = ua.toLowerCase();

  return {
    deviceClass: classifyDevice(lowerUA),
    browserFamily: classifyBrowser(lowerUA),
    osFamily: classifyOS(lowerUA),
    deviceBrand: classifyDeviceBrand(lowerUA),
  };
}

function classifyDevice(ua: string): DeviceClass {
  // Tablet checks first (some tablets include "mobile" in UA)
  if (/ipad|tablet|playbook|silk|kindle/i.test(ua)) {
    return 'tablet';
  }
  // Android tablets often lack "mobile"
  if (/android/i.test(ua) && !/mobile/i.test(ua)) {
    return 'tablet';
  }
  // Mobile devices
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|opera mobi/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

export function classifyBrowser(ua: string): BrowserFamily {
  // 1. Bots, crawlers, and automated tools
  if (
    /bot|spider|crawl|slurp|curl|python|wget|postman|apidog|go-http-client|uptime|headless|github-camo|uptimerobot/i.test(
      ua,
    )
  ) {
    return 'bot_crawler';
  }

  // 2. Chinese In-App & Custom Mobile/Desktop Browsers (check before Chrome/Safari)
  if (/micromessenger/i.test(ua)) {
    return 'wechat';
  }
  if (/qqbrowser|mqqbrowser/i.test(ua)) {
    return 'qqbrowser';
  }
  if (/quark/i.test(ua)) {
    return 'quark';
  }
  if (/ucbrowser|ubrowser/i.test(ua)) {
    return 'uc';
  }
  if (/baiduboxapp|baidubrowser/i.test(ua)) {
    return 'baidu';
  }
  if (/360se|360ee|qihu/i.test(ua)) {
    return '360';
  }
  if (/metasr|sogou/i.test(ua)) {
    return 'sogou';
  }

  // 3. Alternative Modern Browsers
  if (/edg(e|a|ios)?\/\d/i.test(ua)) {
    return 'edge';
  }
  if (/opr\/|opera\//i.test(ua)) {
    return 'opera';
  }
  if (/vivaldi/i.test(ua)) {
    return 'vivaldi';
  }
  if (/brave/i.test(ua)) {
    return 'brave';
  }
  if (/firefox\/\d|fxios\/\d/i.test(ua)) {
    return 'firefox';
  }

  // 4. Chrome vs Safari (Chrome UAs contain Safari, so check Chrome first)
  if (/chrom(e|ium)\/\d|crios\/\d/i.test(ua)) {
    return 'chrome';
  }
  if (/safari\/\d/i.test(ua)) {
    return 'safari';
  }

  return 'other';
}

function classifyOS(ua: string): OsFamily {
  if (/iphone|ipad|ipod/i.test(ua)) {
    return 'ios';
  }
  if (/android/i.test(ua)) {
    return 'android';
  }
  if (/windows/i.test(ua)) {
    return 'windows';
  }
  if (/macintosh|mac os/i.test(ua)) {
    return 'macos';
  }
  if (/linux/i.test(ua)) {
    return 'linux';
  }
  return 'other';
}

/**
 * Coarsely classifies the hardware/device brand.
 * Specifically distinguishes Apple, Xiaomi, Huawei, Honor, OPPO, Vivo, Samsung, etc.
 */
export function classifyDeviceBrand(ua: string | null): string {
  if (!ua) return 'Other (其他)';
  const u = ua.toLowerCase();

  // Apple
  if (/iphone/i.test(u)) return 'Apple iPhone';
  if (/ipad/i.test(u)) return 'Apple iPad';
  if (/macintosh|mac os/i.test(u)) return 'Apple Mac';

  // Huawei & Honor
  if (/honor/i.test(u)) return 'Honor (荣耀)';
  if (/huawei|harmonyos|hmscore|alm-|ana-|els-|nop-|jad-|vce-|lya-|clt-|vog-/i.test(u)) {
    return 'Huawei (华为)';
  }

  // Xiaomi & Redmi
  if (/xiaomi|redmi|miui|hyperos|\bmi\b|\bmix\b|22011211c|23049rad8c|23127pn0cc/i.test(u)) {
    return 'Xiaomi (小米/红米)';
  }

  // OPPO & OnePlus & Realme
  if (/oneplus/i.test(u)) return 'OnePlus (一加)';
  if (/realme/i.test(u)) return 'Realme (真我)';
  if (/oppo|coloros|pht110|pgem10/i.test(u)) return 'OPPO';

  // Vivo & iQOO
  if (/iqoo/i.test(u)) return 'iQOO';
  if (/vivo|originos/i.test(u)) return 'vivo';

  // Other Android Brands
  if (/samsung|sm-|galaxy/i.test(u)) return 'Samsung (三星)';
  if (/meizu|flyme/i.test(u)) return 'Meizu (魅族)';
  if (/pixel/i.test(u)) return 'Google Pixel';

  // Desktop PCs
  if (/windows/i.test(u)) return 'Windows PC';
  if (/linux/i.test(u) && !/android/i.test(u)) return 'Linux PC';

  if (/android/i.test(u)) return 'Android Other (其他安卓)';
  return 'Other (其他终端)';
}

