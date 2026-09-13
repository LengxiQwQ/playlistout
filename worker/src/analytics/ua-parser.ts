/**
 * Lightweight Coarse User-Agent Parser
 *
 * Extracts device_class, browser_family, and os_family from the User-Agent header.
 * No npm dependencies — uses simple regex matching for major browsers/OS.
 *
 * PRIVACY: The full User-Agent string is NEVER stored.
 * Only the coarse parsed categories are written to analytics.
 */

import type { DeviceClass, BrowserFamily, OsFamily } from './types';

export interface ParsedUA {
  deviceClass: DeviceClass;
  browserFamily: BrowserFamily;
  osFamily: OsFamily;
}

/**
 * Parses a User-Agent string into coarse device, browser, and OS categories.
 * Returns safe defaults ('desktop', 'other', 'other') for missing or unparseable input.
 */
export function parseUserAgent(ua: string | null): ParsedUA {
  if (!ua) {
    return { deviceClass: 'desktop', browserFamily: 'other', osFamily: 'other' };
  }

  const lowerUA = ua.toLowerCase();

  return {
    deviceClass: classifyDevice(lowerUA),
    browserFamily: classifyBrowser(lowerUA),
    osFamily: classifyOS(lowerUA),
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

function classifyBrowser(ua: string): BrowserFamily {
  // Order matters — check more specific patterns first
  if (/edg(e|a|ios)?\/\d/i.test(ua)) {
    return 'edge';
  }
  if (/firefox\/\d|fxios\/\d/i.test(ua)) {
    return 'firefox';
  }
  if (/safari\/\d/i.test(ua) && !/chrom(e|ium)\/\d/i.test(ua)) {
    return 'safari';
  }
  if (/chrom(e|ium)\/\d|crios\/\d/i.test(ua)) {
    return 'chrome';
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
