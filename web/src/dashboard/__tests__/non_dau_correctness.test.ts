import { describe, expect, it } from 'vitest';
import { buildAnalyticsSlice, buildFeedbackSlice, buildQuarantineSlice, resolvePageFilterParams } from '../engine';
import type { AnalyticsSnapshot } from '../types';

describe('Insights V4 Non-DAU Correctness Baselines (Phase 0 Red Tests)', () => {
  const testSnapshot: AnalyticsSnapshot = {
    version: 2,
    generatedAt: '2026-10-10T12:00:00Z',
    dailyCore: [
      {
        date: '2026-10-10',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        metric: 'resolve_request',
        count: 10,
      },
      {
        date: '2026-10-10',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        metric: 'playlist_success',
        count: 10,
      },
      {
        date: '2026-10-10',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        metric: 'export',
        count: 6,
      },
      {
        date: '2026-10-10',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        metric: 'clipboard',
        count: 4,
      },
      {
        date: '2026-10-10',
        channel: 'web',
        client_id: 'official_web',
        platform: 'none',
        metric: 'visitor_unique',
        count: 15,
      },
      {
        date: '2026-10-10',
        channel: 'plugin',
        client_id: 'musicfree',
        platform: 'netease',
        metric: 'resolve_request',
        count: 30,
      },
      {
        date: '2026-10-10',
        channel: 'plugin',
        client_id: 'musicfree',
        platform: 'netease',
        metric: 'playlist_success',
        count: 30,
      },
    ],
    hourlyCore: [],
    geo: [
      {
        date: '2026-10-10',
        channel: 'web',
        client_id: 'official_web',
        platform: 'none',
        country: 'CN',
        region: 'Guangdong',
        metric: 'visitor_unique',
        count: 15,
      },
      {
        date: '2026-10-10',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        country: 'CN',
        region: 'Guangdong',
        metric: 'resolve_request',
        count: 10,
      },
      {
        date: '2026-10-10',
        channel: 'plugin',
        client_id: 'musicfree',
        platform: 'netease',
        country: 'CN',
        region: 'Guangdong',
        metric: 'resolve_request',
        count: 30,
      },
      {
        date: '2026-10-10',
        channel: 'plugin',
        client_id: 'musicfree',
        platform: 'none',
        country: 'CN',
        region: 'Guangdong',
        metric: 'active_user',
        count: 25,
      },
    ],
    breakdowns: [
      {
        date: '2026-10-10',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        dimension: 'latency_bucket',
        value: '<500ms',
        count: 5,
      },
      {
        date: '2026-10-10',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        dimension: 'latency_bucket',
        value: '500-1000ms',
        count: 20,
      },
      {
        date: '2026-10-10',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        dimension: 'latency_bucket',
        value: '1-3s',
        count: 100,
      },
      {
        date: '2026-10-10',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        dimension: 'latency_bucket',
        value: '3-5s',
        count: 2,
      },
      {
        date: '2026-10-10',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        dimension: 'latency_bucket',
        value: '5s+',
        count: 1,
      },
      {
        date: '2026-10-10',
        channel: 'plugin',
        client_id: 'musicfree',
        platform: 'netease',
        dimension: 'musicfree_version',
        value: 'v1.0.0',
        count: 30,
      },
      {
        date: '2026-10-10',
        channel: 'plugin',
        client_id: 'musicfree',
        platform: 'netease',
        dimension: 'musicfree_host',
        value: 'android',
        count: 30,
      },
    ],
    clientEnv: [],
    quarantine: [],
    feedback: [],
  };

  it('Issue 1: Web geo must only count visitor_unique from channel=web', () => {
    const slice = buildAnalyticsSlice(testSnapshot, { from: '2026-10-10', to: '2026-10-10' });
    // Web geo should be isolated: only visitor_unique on channel=web (15), NOT 15+10+30+25 = 80
    const webGeoCountry = (slice as unknown as { webGeo?: { countries: Array<{ name: string; count: number }> } }).webGeo?.countries || slice.geo.countries;
    const cn = webGeoCountry.find((c) => c.name === 'CN');
    expect(cn?.count).toBe(15);
  });

  it('Issue 2: Overview requested platforms must only count resolve_request, not export or clipboard', () => {
    const slice = buildAnalyticsSlice(testSnapshot, { from: '2026-10-10', to: '2026-10-10' });
    const qqmusic = slice.distributions.platforms.find((p) => p.name === 'qqmusic');
    // qqmusic resolve_request is 10. Currently it returns 10 + 6 + 4 = 20
    expect(qqmusic?.count).toBe(10);
  });

  it('Issue 7: Latency bucket must be ordered in business sequence (<500ms, 500-1000ms, 1-3s, 3-5s, 5s+), not count descending', () => {
    const slice = buildAnalyticsSlice(testSnapshot, { from: '2026-10-10', to: '2026-10-10' });
    const buckets = slice.breakdowns['latency_bucket'] || [];
    const bucketNames = buckets.map((b) => b.name);
    expect(bucketNames).toEqual(['<500ms', '500-1000ms', '1-3s', '3-5s', '5s+']);
  });

  describe('Phase 2 — Filter Scope Architecture', () => {
    it('PAGE_FILTER_CAPABILITIES defines explicit supported dimensions for each page', async () => {
      const { PAGE_FILTER_CAPABILITIES } = await import('../types');
      expect(PAGE_FILTER_CAPABILITIES.overview.supportedDimensions).toEqual([]);
      expect(PAGE_FILTER_CAPABILITIES.web.supportedDimensions).toEqual(['country', 'region']);
      expect(PAGE_FILTER_CAPABILITIES.reliability.supportedDimensions).toEqual(['channel', 'client', 'platform']);
      expect(PAGE_FILTER_CAPABILITIES.usage.supportedDimensions).toEqual(['channel', 'client', 'platform']);
      expect(PAGE_FILTER_CAPABILITIES.integrations.supportedDimensions).toEqual(['client', 'channel']);
      expect(PAGE_FILTER_CAPABILITIES.feedback.supportedDimensions).toEqual(['platform', 'country', 'region']);
      expect(PAGE_FILTER_CAPABILITIES.security.supportedDimensions).toEqual(['platform', 'country', 'region']);
      expect(PAGE_FILTER_CAPABILITIES.dau.supportedDimensions).toEqual(['channel', 'country', 'region']);
    });

    it('resolvePageFilterParams strips unsupported dimensions according to page capabilities', async () => {
      const { resolvePageFilterParams } = await import('../engine');
      const fullParams = {
        from: '2026-10-01',
        to: '2026-10-10',
        channel: 'web',
        client: 'official_web',
        platform: 'qqmusic',
        country: 'CN',
        region: 'Guangdong',
        exclude_my: true,
      };

      // Overview: all dimensions stripped
      const ovParams = resolvePageFilterParams(fullParams, 'overview');
      expect(ovParams.from).toBe('2026-10-01');
      expect(ovParams.to).toBe('2026-10-10');
      expect(ovParams.channel).toBe('');
      expect(ovParams.client).toBe('');
      expect(ovParams.platform).toBe('');
      expect(ovParams.country).toBe('');
      expect(ovParams.region).toBe('');

      // Web: channel/client/platform stripped, country/region kept
      const webParams = resolvePageFilterParams(fullParams, 'web');
      expect(webParams.channel).toBe('');
      expect(webParams.client).toBe('');
      expect(webParams.platform).toBe('');
      expect(webParams.country).toBe('CN');
      expect(webParams.region).toBe('Guangdong');

      // Reliability: country/region stripped, channel/client/platform kept
      const relParams = resolvePageFilterParams(fullParams, 'reliability');
      expect(relParams.channel).toBe('web');
      expect(relParams.client).toBe('official_web');
      expect(relParams.platform).toBe('qqmusic');
      expect(relParams.country).toBe('');
      expect(relParams.region).toBe('');

      // Feedback: channel/client stripped, platform/country/region kept
      const fbParams = resolvePageFilterParams(fullParams, 'feedback');
      expect(fbParams.channel).toBe('');
      expect(fbParams.client).toBe('');
      expect(fbParams.platform).toBe('qqmusic');
      expect(fbParams.country).toBe('CN');
      expect(fbParams.region).toBe('Guangdong');

      // Security: channel/client stripped, platform/country/region kept
      const secParams = resolvePageFilterParams(fullParams, 'security');
      expect(secParams.channel).toBe('');
      expect(secParams.client).toBe('');
      expect(secParams.platform).toBe('qqmusic');
      expect(secParams.country).toBe('CN');
      expect(secParams.region).toBe('Guangdong');
    });

    it('buildAnalyticsSlice, buildFeedbackSlice, buildQuarantineSlice attach filterContract', async () => {
      const { buildFeedbackSlice, buildQuarantineSlice } = await import('../engine');
      const slice = buildAnalyticsSlice(testSnapshot, { from: '2026-10-10', to: '2026-10-10' });
      expect(slice.filterContract).toBeDefined();

      const fbSlice = buildFeedbackSlice(testSnapshot, { from: '2026-10-10', to: '2026-10-10' });
      expect(fbSlice.filterContract?.supportedDimensions).toEqual(['platform', 'country', 'region']);

      const qSlice = buildQuarantineSlice(testSnapshot, { from: '2026-10-10', to: '2026-10-10' });
      expect(qSlice.filterContract?.supportedDimensions).toEqual(['platform', 'country', 'region']);
    });
  });

  describe('Phase 3 — Split Usage and Reliability', () => {
    it('Usage and Reliability dimensions are distinctly partitioned', () => {
      const slice = buildAnalyticsSlice(testSnapshot, { from: '2026-10-10', to: '2026-10-10' });
      const b = slice.breakdowns;

      // Usage metrics & dimensions
      expect(slice.overview.resolve_request).toBeGreaterThan(0);
      expect(slice.overview.export).toBeGreaterThan(0);
      expect(slice.overview.clipboard).toBeGreaterThan(0);
      expect(slice.distributions.platforms.length).toBeGreaterThan(0);

      // Reliability metrics & dimensions
      expect(b['latency_bucket']).toBeDefined();
    });
  });

  describe('Phase 4 — Overview Overhaul & Period Comparison', () => {
    it('buildAnalyticsSlice computes previousOverview for equivalent previous period', () => {
      // testSnapshot has data on 2026-10-10
      // If we query 2026-10-11, previous period is 2026-10-10
      const snapshotWithExtraDay = {
        ...testSnapshot,
        dailyCore: [
          ...testSnapshot.dailyCore,
          {
            date: '2026-10-11',
            channel: 'web',
            client_id: 'official_web',
            platform: 'qqmusic',
            metric: 'resolve_request',
            count: 20,
          },
        ],
      };

      const slice = buildAnalyticsSlice(snapshotWithExtraDay, { from: '2026-10-11', to: '2026-10-11' });
      expect(slice.overview.resolve_request).toBe(20);
      expect(slice.previousOverview).toBeDefined();
      expect(slice.previousOverview?.resolve_request).toBe(40); // 10 (qqmusic) + 30 (netease) on 2026-10-10

      // With platform filter
      const qqSlice = buildAnalyticsSlice(snapshotWithExtraDay, { from: '2026-10-11', to: '2026-10-11', platform: 'qqmusic' });
      expect(qqSlice.previousOverview?.resolve_request).toBe(10);
    });
  });

  describe('Phase 5 — Web Analytics Overhaul', () => {
    it('Web page scope isolates Web metrics and strips non-web dimensions', () => {
      const fullParams = {
        from: '2026-10-10',
        to: '2026-10-10',
        channel: 'plugin', // Attempting to pass plugin to web
        client: 'musicfree',
        country: 'CN',
        region: 'Guangdong',
      };
      const webParams = resolvePageFilterParams(fullParams, 'web');
      expect(webParams.channel).toBe('');
      expect(webParams.client).toBe('');
      expect(webParams.country).toBe('CN');
      expect(webParams.region).toBe('Guangdong');

      const slice = buildAnalyticsSlice(testSnapshot, webParams);
      expect(slice.webGeo.countries.find((c) => c.name === 'CN')?.count).toBe(15);
      expect(slice.webTimeseries?.length).toBeGreaterThan(0);
    });


    it('Web Geo strictly reconciles with Web visitor_unique and never mixes plugin/cli', () => {
      const slice = buildAnalyticsSlice(testSnapshot, { from: '2026-10-10', to: '2026-10-10', channel: 'web' });
      const webCountries = slice.webGeo.countries;
      const cn = webCountries.find((c) => c.name === 'CN');
      expect(cn?.count).toBe(15);

      // Verify that slice.webGeo is present and strictly equals visitor_unique on channel=web
      const totalWebGeoUV = webCountries.reduce((sum, c) => sum + c.count, 0);
      expect(totalWebGeoUV).toBe(15);
    });

    it('Web timeseries contains page_view and visitor_unique for traffic trends', () => {
      const snapshotWithWeb = {
        ...testSnapshot,
        dailyCore: [
          ...testSnapshot.dailyCore,
          {
            date: '2026-10-10',
            channel: 'web',
            client_id: 'official_web',
            platform: 'none',
            metric: 'page_view',
            count: 45,
          },
        ],
      };
      const slice = buildAnalyticsSlice(snapshotWithWeb, { from: '2026-10-10', to: '2026-10-10', channel: 'web' });
      const pt = slice.timeseries.find((t) => t.date === '2026-10-10');
      expect(pt).toBeDefined();
      expect(pt?.['page_view']).toBe(45);
      expect(pt?.['visitor_unique']).toBe(15);
    });
  });

  describe('Phase 6: Integrations Dynamic Clients & Overhaul', () => {
    it('buildAnalyticsSlice dynamically computes integrationClients for all clients in dailyCore', () => {
      const slice = buildAnalyticsSlice(testSnapshot, { from: '2026-10-10', to: '2026-10-10' });
      expect(slice.integrationClients).toBeDefined();
      expect(Array.isArray(slice.integrationClients)).toBe(true);

      const mf = slice.integrationClients?.find((c) => c.clientId === 'musicfree');
      expect(mf).toBeDefined();
      expect(mf?.channel).toBe('plugin');
      expect(mf?.requests).toBe(30);
      expect(mf?.successRate).toBe(100);

      const web = slice.integrationClients?.find((c) => c.clientId === 'official_web');
      expect(web).toBeDefined();
      expect(web?.channel).toBe('web');
      expect(web?.requests).toBe(10);
      expect(web?.successRate).toBe(100);
    });

    it('integrationClients includes versionDistribution and hostDistribution dynamically', () => {
      const slice = buildAnalyticsSlice(testSnapshot, { from: '2026-10-10', to: '2026-10-10' });
      const mf = slice.integrationClients?.find((c) => c.clientId === 'musicfree');
      expect(mf?.versionDistribution).toBeDefined();
      expect(mf?.versionDistribution.length).toBeGreaterThan(0);
      expect(mf?.versionDistribution[0].name).toBe('v1.0.0');
      expect(mf?.hostDistribution).toBeDefined();
      expect(mf?.hostDistribution.length).toBeGreaterThan(0);
      expect(mf?.hostDistribution[0].name).toBe('android');
      expect(mf?.topVersion).toBe('v1.0.0');
      expect(mf?.topHost).toBe('android');
    });

    it('integrationClients handles unknown or new arbitrary clients smoothly', () => {
      const arbitrarySnapshot: AnalyticsSnapshot = {
        ...testSnapshot,
        dailyCore: [
          ...testSnapshot.dailyCore,
          {
            date: '2026-10-10',
            channel: 'plugin',
            client_id: 'lx_music',
            platform: 'qqmusic',
            metric: 'resolve_request',
            count: 42,
          },
          {
            date: '2026-10-10',
            channel: 'plugin',
            client_id: 'lx_music',
            platform: 'qqmusic',
            metric: 'playlist_success',
            count: 21,
          },
        ],
      };
      const slice = buildAnalyticsSlice(arbitrarySnapshot, { from: '2026-10-10', to: '2026-10-10' });
      const lx = slice.integrationClients?.find((c) => c.clientId === 'lx_music');
      expect(lx).toBeDefined();
      expect(lx?.requests).toBe(42);
      expect(lx?.successRate).toBe(50);
      expect(lx?.versionDistribution).toEqual([]);
      expect(lx?.hostDistribution).toEqual([]);
    });
  });

  describe('Phase 7 — Feedback & Security Polish', () => {
    const feedbackTestSnapshot: AnalyticsSnapshot = {
      ...testSnapshot,
      feedback: [
        {
          id: 1,
          platform: 'qqmusic',
          source_url: 'https://y.qq.com/n/ryqq/playlist/1',
          error_code: 'UPSTREAM_TIMEOUT',
          country: 'CN',
          region: 'Guangdong',
          city: 'Shenzhen',
          report_count: 5,
          status: 'pending',
          last_reported_at: '2026-10-10T12:00:00Z',
          first_reported_at: '2026-10-10T12:00:00Z',
        },
        {
          id: 2,
          platform: 'netease',
          source_url: 'https://music.163.com/playlist?id=2',
          error_code: 'NOT_FOUND',
          country: 'CN',
          region: 'Beijing',
          city: 'Beijing',
          report_count: 20,
          status: 'pending',
          last_reported_at: '2026-10-09T10:00:00Z',
          first_reported_at: '2026-10-09T10:00:00Z',
        },
        {
          id: 3,
          platform: 'qqmusic',
          source_url: 'https://y.qq.com/n/ryqq/playlist/3',
          error_code: 'UPSTREAM_TIMEOUT',
          country: 'CN',
          region: 'Shanghai',
          city: 'Shanghai',
          report_count: 2,
          status: 'resolved',
          last_reported_at: '2026-10-10T18:00:00Z',
          first_reported_at: '2026-10-10T18:00:00Z',
        },
      ],
      quarantine: [
        {
          id: 101,
          incident_date: '2026-10-08',
          reason: 'auto_quarantined_bot_ua',
          country: 'US',
          count: 10,
        },
        {
          id: 102,
          incident_date: '2026-10-10',
          reason: 'crawler_script_abuse_chengdu_api',
          country: 'CN',
          count: 50,
        },
        {
          id: 103,
          incident_date: '2026-10-10',
          reason: 'auto_quarantined_bot_ua',
          country: 'CN',
          count: 25,
        },
      ],
    };

    it('buildFeedbackSlice supports sorting: recent, frequent, and oldest_pending', () => {
      // Recent (default): id 3 (18:00), then id 1 (12:00), then id 2 (09T10:00)
      const recent = buildFeedbackSlice(feedbackTestSnapshot, { sort_by: 'recent' });
      expect(recent.entries.map((e) => e.id)).toEqual([3, 1, 2]);

      // Frequent: id 2 (20), then id 1 (5), then id 3 (2)
      const frequent = buildFeedbackSlice(feedbackTestSnapshot, { sort_by: 'frequent' });
      expect(frequent.entries.map((e) => e.id)).toEqual([2, 1, 3]);

      // Oldest pending: pending first in ascending order: id 2 (09T10:00), then id 1 (10T12:00), then resolved id 3
      const oldestPending = buildFeedbackSlice(feedbackTestSnapshot, { sort_by: 'oldest_pending' });
      expect(oldestPending.entries.map((e) => e.id)).toEqual([2, 1, 3]);
    });

    it('buildFeedbackSlice supports error_code filtering and returns availableErrorCodes & stats', () => {
      const filtered = buildFeedbackSlice(feedbackTestSnapshot, { error_code: 'UPSTREAM_TIMEOUT' });
      expect(filtered.entries.length).toBe(2);
      expect(filtered.entries.every((e) => e.error_code === 'UPSTREAM_TIMEOUT')).toBe(true);

      // availableErrorCodes on unfiltered slice
      const allSlice = buildFeedbackSlice(feedbackTestSnapshot, {});
      expect(allSlice.availableErrorCodes).toBeDefined();
      const timeoutCode = allSlice.availableErrorCodes?.find((c) => c.name === 'UPSTREAM_TIMEOUT');
      expect(timeoutCode?.count).toBe(2);

      // stats
      expect(allSlice.stats).toBeDefined();
      expect(allSlice.stats?.uniqueUrls).toBe(3);
      expect(allSlice.stats?.totalReports).toBe(27);
      expect(allSlice.stats?.topPlatform).toBe('qqmusic');
      expect(allSlice.stats?.topErrorCode).toBe('UPSTREAM_TIMEOUT');
    });

    it('buildQuarantineSlice returns timeseries and reasons distribution', () => {
      const qSlice = buildQuarantineSlice(feedbackTestSnapshot, {});
      expect(qSlice.totalRecords).toBe(3);
      expect(qSlice.totalEvents).toBe(85);

      // Timeseries: 2026-10-08 (10 events, 1 record), 2026-10-10 (75 events, 2 records)
      expect(qSlice.timeseries).toBeDefined();
      expect(qSlice.timeseries?.length).toBe(2);
      expect(qSlice.timeseries?.[0].date).toBe('2026-10-08');
      expect(qSlice.timeseries?.[0].events).toBe(10);
      expect(qSlice.timeseries?.[1].date).toBe('2026-10-10');
      expect(qSlice.timeseries?.[1].events).toBe(75);

      // Reasons: crawler_script_abuse_chengdu_api (50), auto_quarantined_bot_ua (35)
      expect(qSlice.reasons).toBeDefined();
      expect(qSlice.reasons?.length).toBe(2);
      expect(qSlice.reasons?.[0].name).toBe('crawler_script_abuse_chengdu_api');
      expect(qSlice.reasons?.[0].count).toBe(50);
      expect(qSlice.reasons?.[1].name).toBe('auto_quarantined_bot_ua');
      expect(qSlice.reasons?.[1].count).toBe(35);
    });
  });
});

