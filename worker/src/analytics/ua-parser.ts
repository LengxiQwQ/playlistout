/**
 * Lightweight Coarse User-Agent Parser & Device Brand Classifier
 *
 * Extracts device_class, browser_family, os_family, and device_brand from the User-Agent header.
 * No external npm dependencies — uses fast regex matching and dynamic model/browser extraction.
 *
 * PRIVACY: The full User-Agent string is NEVER stored.
 * Only coarse parsed categories (e.g. 'Xiaomi', 'Chrome', 'Android: Fairphone 4') are written to analytics.
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
    return { deviceClass: 'desktop', browserFamily: 'other', osFamily: 'other', deviceBrand: 'Other (其他终端)' };
  }

  const rawUA = ua.trim();
  const lowerUA = rawUA.toLowerCase();

  return {
    deviceClass: classifyDevice(lowerUA),
    browserFamily: classifyBrowser(rawUA),
    osFamily: classifyOS(lowerUA),
    deviceBrand: classifyDeviceBrand(rawUA),
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

/**
 * Classifies the browser family with comprehensive domestic/global detection
 * and dynamic fallback for unlisted browsers.
 */
export function classifyBrowser(rawUA: string): BrowserFamily {
  const ua = rawUA.trim();
  if (!ua) return 'other';

  // 1. Bots, crawlers, and automated tools
  if (
    /bot|spider|crawl|slurp|curl|python|wget|postman|apidog|go-http-client|uptime|headless|github-camo|uptimerobot|lighthouse|insights/i.test(
      ua,
    )
  ) {
    return 'bot_crawler';
  }

  // 2. Chinese In-App & Domestic Browsers (check before standard Chrome/Safari)
  if (/micromessenger/i.test(ua)) return 'wechat';
  if (/qqbrowser|mqqbrowser/i.test(ua)) return 'qqbrowser';
  if (/quark/i.test(ua)) return 'quark';
  if (/ucbrowser|ubrowser/i.test(ua)) return 'uc';
  if (/baiduboxapp|baidubrowser/i.test(ua)) return 'baidu';
  if (/360se|360ee|qihu/i.test(ua)) return '360';
  if (/metasr|sogou/i.test(ua)) return 'sogou';
  if (/samsungbrowser/i.test(ua)) return 'samsung_browser';
  if (/miuibrowser/i.test(ua)) return 'miui_browser';
  if (/huaweibrowser/i.test(ua)) return 'huawei_browser';
  if (/heytapbrowser/i.test(ua)) return 'oppo_browser';
  if (/vivobrowser/i.test(ua)) return 'vivo_browser';
  if (/honorbrowser/i.test(ua)) return 'honor_browser';
  if (/\bvia\/\d|\bvia\b.*mobile/i.test(ua)) return 'via';
  if (/\bxbrowser\b/i.test(ua)) return 'xbrowser';
  if (/115browser/i.test(ua)) return '115_browser';
  if (/alipayclient/i.test(ua)) return 'alipay';
  if (/dingtalk/i.test(ua)) return 'dingtalk';
  if (/\bweibo\b/i.test(ua)) return 'weibo';
  if (/bili(app|biliapp)?\//i.test(ua)) return 'bilibili';
  if (/aweme|douyin/i.test(ua)) return 'douyin';

  // 3. Modern International Browsers
  if (/edg(e|a|ios)?\/\d/i.test(ua)) return 'edge';
  if (/opr\/|opera\//i.test(ua)) return 'opera';
  if (/vivaldi/i.test(ua)) return 'vivaldi';
  if (/brave/i.test(ua)) return 'brave';
  if (/yabrowser/i.test(ua)) return 'yandex';
  if (/arc\/\d/i.test(ua)) return 'arc';
  if (/torbrowser/i.test(ua)) return 'tor';
  if (/duckduckgo/i.test(ua)) return 'duckduckgo';
  if (/firefox\/\d|fxios\/\d/i.test(ua)) return 'firefox';

  // 4. Dynamic Browser Discovery (Catch unlisted custom browsers before standard Chrome/Safari)
  // 4a. Explicit *browser or *explorer pattern (e.g. AlohaBrowser, SoulBrowser, WhaleBrowser)
  const explicitBrowserMatch = ua.match(/\b([a-z0-9_-]+(?:browser|explorer))[\/\s]?\d*/i);
  if (explicitBrowserMatch && explicitBrowserMatch[1]) {
    const rawName = explicitBrowserMatch[1].toLowerCase().replace(/[-_]+/g, '_');
    if (rawName !== 'browser' && rawName !== 'explorer' && rawName.length <= 30) {
      return rawName;
    }
  }

  // 4b. Trailing product token after Safari in Chromium-based browsers (e.g. Safari/537.36 Waterfox/115.0, Kiwi/116.0)
  const trailingMatch = ua.match(/safari\/[\d\.]+\s+([a-z0-9_-]+)\/[\d\.]+/i);
  if (trailingMatch && trailingMatch[1]) {
    const candidate = trailingMatch[1].toLowerCase().replace(/[-_]+/g, '_');
    const IGNORE_TRAIL = new Set([
      'mobile',
      'version',
      'khtml',
      'gecko',
      'silently',
      'wv',
      'build',
      'crios',
      'safari',
      'chrome',
      'webkit',
    ]);
    if (!IGNORE_TRAIL.has(candidate) && candidate.length >= 3 && candidate.length <= 25) {
      return candidate;
    }
  }

  // 4c. Standalone client token (e.g. CustomApp/1.0)
  const standaloneMatch = ua.match(/^([a-z0-9_-]+)\/[\d\.]+/i);
  if (standaloneMatch && standaloneMatch[1]) {
    const cand = standaloneMatch[1].toLowerCase().replace(/[-_]+/g, '_');
    const IGNORE_STANDALONE = new Set(['mozilla', 'opera', 'dalvik']);
    if (!IGNORE_STANDALONE.has(cand) && cand.length >= 3 && cand.length <= 25) {
      return cand;
    }
  }

  // 5. Standard Chrome vs Safari
  if (/chrom(e|ium)\/\d|crios\/\d/i.test(ua)) return 'chrome';
  if (/safari\/\d/i.test(ua)) return 'safari';

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
 * Coarsely classifies the hardware/device brand, with dynamic fallback for unlisted devices.
 * Known brands: Apple, Huawei, Honor, Xiaomi, OPPO, OnePlus, Realme, vivo, iQOO,
 * Samsung, Meizu, Pixel, Sony, Motorola, Lenovo, Nubia/ZTE, ASUS ROG, Transsion,
 * Nothing, NIO, Desktop PCs.
 * Dynamic fallback: extracts hardware model from Android UA string (e.g. 'Android: Fairphone 4').
 */
export function classifyDeviceBrand(rawUA: string | null): string {
  if (!rawUA) return 'Other (其他终端)';
  const u = rawUA.toLowerCase();

  // 1. Apple Ecosystem
  if (/iphone/i.test(u)) return 'Apple iPhone';
  if (/ipad/i.test(u)) return 'Apple iPad';
  if (/macintosh|mac os/i.test(u)) return 'Apple Mac';
  if (/ipod/i.test(u)) return 'Apple iPod';

  // 2. Huawei & Honor
  if (/\bhonor\b|pgt-|mgy-|fne-|elz-|rep-/i.test(u)) return 'Honor (荣耀)';
  if (/huawei|harmonyos|hmscore|alm-|ana-|els-|nop-|jad-|vce-|lya-|clt-|vog-|mate\s*\d|p\d0|nova\s*\d/i.test(u)) {
    return 'Huawei (华为)';
  }

  // 3. Xiaomi Ecosystem (Xiaomi, Redmi, POCO)
  if (
    /xiaomi|redmi|miui|hyperos|\bmi\b|\bmix\b|pocophone|\bpoco\b|22011211c|23049rad8c|23127pn0cc|23116pn5bc|24031pn0dc|24129pn74c/i.test(
      u,
    )
  ) {
    return 'Xiaomi (小米/红米)';
  }

  // 4. BBK Group: OnePlus, Realme, OPPO
  if (/oneplus|\b1\+|pjd110|phk110/i.test(u)) return 'OnePlus (一加)';
  if (/realme|rmx\d{4}/i.test(u)) return 'Realme (真我)';
  if (/oppo|coloros|heytap|pht110|pgem10|pkm110|phn110|phz110|pjc110|pjd110|pje110|cph\d{4}/i.test(u)) {
    return 'OPPO';
  }

  // 5. BBK Group: vivo & iQOO
  if (/iqoo/i.test(u)) return 'iQOO';
  if (/vivo|originos|v2\d{3}[a-z]?/i.test(u)) return 'vivo';

  // 6. Samsung
  if (/samsung|galaxy|sm-[a-z]\d{3}|gt-[a-z]\d{3}/i.test(u)) return 'Samsung (三星)';

  // 7. Meizu
  if (/meizu|flyme|\bm\d{3}[a-z]?\b/i.test(u)) return 'Meizu (魅族)';

  // 8. Google
  if (/pixel\b/i.test(u)) return 'Google Pixel';

  // 9. Sony
  if (/sony|xperia|xqz-|so-\d{2}/i.test(u)) return 'Sony (索尼)';

  // 10. Motorola & Lenovo
  if (/motorola|moto\b|xt\d{4}/i.test(u)) return 'Motorola (摩托罗拉)';
  if (/lenovo|legion|tb-[a-z0-9]+/i.test(u)) return 'Lenovo (联想)';

  // 11. ZTE / Nubia / RedMagic
  if (/nubia|redmagic|nx\d{3}[a-z]|zte\b/i.test(u)) return 'Nubia / ZTE (努比亚/红魔/中兴)';

  // 12. ASUS
  if (/asus|rog\s*phone|zenfone|asus_/i.test(u)) return 'ASUS (华硕)';

  // 13. Transsion
  if (/infinix|tecno|itel\b/i.test(u)) return 'Transsion (传音/Infinix/Tecno)';

  // 14. Nothing & NIO
  if (/\bnothing\b|a063|a065|ain065/i.test(u)) return 'Nothing Phone';
  if (/nio\s*phone/i.test(u)) return 'NIO Phone (蔚来)';

  // 15. Dynamic Fallback for Android Models (Creates brand-new entries automatically)
  if (/android/i.test(u)) {
    const dynamicModel = extractAndroidModel(rawUA);
    if (dynamicModel) {
      return `Android: ${dynamicModel}`;
    }
    return 'Android Other (其他安卓)';
  }

  // 16. Desktop PCs
  if (/windows/i.test(u)) return 'Windows PC';
  if (/linux/i.test(u) && !/android/i.test(u)) return 'Linux PC';
  if (/cros/i.test(u)) return 'Chromebook';

  // 17. Generic Mobile
  if (/mobile|phone/i.test(u)) return 'Other Mobile (其他移动设备)';

  // 18. Bots
  if (/bot|spider|crawl|slurp|curl|python|wget/i.test(u)) return 'Bot / Crawler (爬虫)';

  return 'Other (其他终端)';
}

/**
 * Dynamically extracts device model candidate from an Android User-Agent string.
 * Example:
 *   "Mozilla/5.0 (Linux; U; Android 14; zh-cn; Fairphone 4 Build/FP4) ..." -> "Fairphone 4"
 *   "Mozilla/5.0 (Linux; Android 13; Smartisan Nut Pro 3 Build/RD2001) ..." -> "Smartisan Nut Pro 3"
 */
export function extractAndroidModel(ua: string): string | null {
  // 1. Try standard pattern: Android [version]; [lang;] <Model> Build/ or )
  const match = ua.match(/android\s+[\d\.]+;\s*(?:[a-z]{2}(?:-[a-z]{2})?;\s*)?([^;()]+?)(?:\s+build|\)|\s*;\s*wv)/i);
  if (match && match[1]) {
    let model = match[1].trim();
    model = model.replace(/^linux;\s*/i, '').replace(/build\/.*$/i, '').trim();
    if (
      !/^(mobile|tablet|khtml|version|release|wv|zh-cn|en-us|generic|k)$/i.test(model) &&
      model.length >= 2 &&
      model.length <= 35
    ) {
      return model;
    }
  }

  // 2. Fallback: inspect parenthetical expression containing "android"
  const parenMatch = ua.match(/\(([^)]*android[^)]*)\)/i);
  if (parenMatch && parenMatch[1]) {
    const parts = parenMatch[1].split(';').map(p => p.trim());
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (
        !/android/i.test(part) &&
        !/linux/i.test(part) &&
        !/^[a-z]{2}(-[a-z]{2})?$/i.test(part) &&
        !/^(u|wv|mobile|tablet|release|generic|k)$/i.test(part) &&
        !/build\//i.test(part) &&
        part.length >= 2 &&
        part.length <= 35
      ) {
        return part.replace(/build\/.*$/i, '').trim();
      }
    }
  }

  return null;
}


