import { describe, expect, it } from 'vitest';
import {
  createAnalyticsRequestContextV2,
  normalizeAnalyticsPlatformV2,
} from './context';

function request(headers: Record<string, string> = {}, cf?: Record<string, unknown>): Request {
  const req = new Request('https://playlistout-api.lengxiqwq.com/api/v1/resolve?q=12345', { headers });
  if (cf) (req as any).cf = cf;
  return req;
}

describe('Analytics V2 request context', () => {
  it('classifies explicit MusicFree attribution before browser-like hints', () => {
    const ctx = createAnalyticsRequestContextV2(request({
      'X-PlaylistOut-Client-Type': 'plugin',
      'X-PlaylistOut-Client-Id': 'musicfree',
      'X-PlaylistOut-Client-Version': '1.3.9',
      'X-PlaylistOut-Host': 'android',
      Origin: 'https://playlistout.lengxiqwq.com',
      'User-Agent': 'PlaylistOut-MusicFree/1.3.9',
    }, { country: 'cn', region: 'Guangdong' }));

    expect(ctx.channel).toBe('plugin');
    expect(ctx.clientId).toBe('musicfree');
    expect(ctx.clientVersion).toBe('1.3.9');
    expect(ctx.hostPlatform).toBe('android');
    expect(ctx.country).toBe('CN');
    expect(ctx.region).toBe('Guangdong');
  });

  it('classifies official frontend traffic separately from public API traffic', () => {
    const web = createAnalyticsRequestContextV2(request({
      Origin: 'https://playlistout.lengxiqwq.com',
      'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0',
    }));
    const api = createAnalyticsRequestContextV2(request({
      'User-Agent': 'my-client/1.0',
    }));

    expect(web.channel).toBe('web');
    expect(web.clientId).toBe('official_web');
    expect(api.channel).toBe('api');
    expect(api.clientId).toBe('anonymous_api');
  });

  it('bounds unknown plugins and rejects unbounded version/host values', () => {
    const ctx = createAnalyticsRequestContextV2(request({
      'X-PlaylistOut-Client-Type': 'plugin',
      'X-PlaylistOut-Client-Id': 'made-up-plugin-user-123',
      'X-PlaylistOut-Client-Version': 'bad version with spaces and user data',
      'X-PlaylistOut-Host': 'serial-12345',
    }));

    expect(ctx.channel).toBe('plugin');
    expect(ctx.clientId).toBe('unknown_plugin');
    expect(ctx.clientVersion).toBeNull();
    expect(ctx.hostPlatform).toBe('unknown');
  });

  it('keeps ordinary API tools in product traffic but marks real crawlers automated', () => {
    const curl = createAnalyticsRequestContextV2(request({
      'User-Agent': 'curl/8.7.1',
    }));
    const crawler = createAnalyticsRequestContextV2(request({
      'User-Agent': 'Googlebot/2.1',
    }));

    expect(curl.channel).toBe('api');
    expect(curl.isAutomated).toBe(false);
    expect(crawler.channel).toBe('api');
    expect(crawler.isAutomated).toBe(true);
  });

  it('never emits legacy all/TOTAL platform tokens', () => {
    expect(normalizeAnalyticsPlatformV2('all')).toBe('unknown');
    expect(normalizeAnalyticsPlatformV2('TOTAL')).toBe('unknown');
    expect(normalizeAnalyticsPlatformV2('netease')).toBe('netease');
  });
});
