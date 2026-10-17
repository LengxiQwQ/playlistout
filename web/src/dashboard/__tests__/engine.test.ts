import { describe, expect, it } from 'vitest';
import {
  buildAnalyticsSlice,
  buildFeedbackSlice,
  buildQuarantineSlice,
  reconcileBreakdownRows,
  reconcileClientEnv,
  reconcileDailyCore,
} from '../engine';
import type { AnalyticsSnapshot, FeedbackRow } from '../types';

describe('Analytics Dashboard In-Memory Slice Engine', () => {
  const mockSnapshot: AnalyticsSnapshot = {
    version: 2,
    generatedAt: '2026-10-10T10:00:00Z',
    dailyCore: [
      {
        date: '2026-10-04',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        metric: 'resolve_request',
        count: 10,
      },
      {
        date: '2026-10-04',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        metric: 'playlist_success',
        count: 8,
      },
      {
        date: '2026-10-04',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        metric: 'resolve_failure',
        count: 2,
      },
      {
        date: '2026-10-04',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        metric: 'export',
        count: 5,
      },
      {
        date: '2026-10-05',
        channel: 'plugin',
        client_id: 'musicfree',
        platform: 'netease',
        metric: 'resolve_request',
        count: 20,
      },
      {
        date: '2026-10-05',
        channel: 'plugin',
        client_id: 'musicfree',
        platform: 'netease',
        metric: 'playlist_success',
        count: 15,
      },
      {
        date: '2026-10-05',
        channel: 'plugin',
        client_id: 'musicfree',
        platform: 'netease',
        metric: 'user_success',
        count: 3,
      },
      {
        date: '2026-10-05',
        channel: 'plugin',
        client_id: 'musicfree',
        platform: 'netease',
        metric: 'resolve_failure',
        count: 2,
      },
      {
        date: '2026-10-05',
        channel: 'plugin',
        client_id: 'musicfree',
        platform: 'netease',
        metric: 'export',
        count: 10,
      },
    ],
    hourlyCore: [
      { date: '2026-10-04', hour: 10, metric: 'resolve_request', count: 4 },
      { date: '2026-10-04', hour: 11, metric: 'resolve_request', count: 6 },
    ],
    geo: [
      {
        date: '2026-10-04',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        country: 'CN',
        region: 'Guangdong',
        metric: 'resolve_request',
        count: 8,
      },
      {
        date: '2026-10-04',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        country: 'MY',
        region: 'Kuala Lumpur',
        metric: 'resolve_request',
        count: 2,
      },
    ],
    breakdowns: [
      {
        date: '2026-10-04',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        dimension: 'latency_bucket',
        value: '_500ms',
        count: 7,
      },
      {
        date: '2026-10-04',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        dimension: 'export_format',
        value: 'xlsx',
        count: 5,
      },
      {
        date: '2026-10-05',
        channel: 'plugin',
        client_id: 'musicfree',
        platform: 'netease',
        dimension: 'export_format',
        value: 'json',
        count: 10,
      },
    ],
    clientEnv: [
      {
        date: '2026-10-04',
        channel: 'legacy_mixed',
        client_id: 'legacy_unknown',
        device_class: 'desktop',
        browser_family: 'playlistout_musicfree',
        os_family: 'windows',
        count: 3,
      },
      {
        date: '2026-10-05',
        channel: 'web',
        client_id: 'official_web',
        device_class: 'mobile',
        browser_family: 'chrome',
        os_family: 'android',
        count: 7,
      },
    ],
    feedback: [
      {
        id: 1,
        platform: 'qqmusic',
        source_url: 'https://y.qq.com/n/ryqq/playlist/123',
        error_code: 'UPSTREAM_TIMEOUT',
        report_count: 3,
        first_reported_at: '2026-10-04T00:00:00Z',
        last_reported_at: '2026-10-04T12:00:00Z',
        status: 'pending',
      },
      {
        id: 2,
        platform: 'netease',
        source_url: 'https://music.163.com/playlist?id=456',
        error_code: null,
        report_count: 1,
        first_reported_at: '2026-10-05T00:00:00Z',
        last_reported_at: '2026-10-05T10:00:00Z',
        status: 'resolved',
      },
    ],
    quarantine: [
      {
        id: 10,
        incident_date: '2026-10-04',
        reason: 'rate_limited',
        count: 5,
      },
      {
        id: 11,
        incident_date: '2026-10-05',
        reason: 'bot_signature',
        count: 12,
      },
    ],
  };

  it('reconciles legacy daily core rows correctly', () => {
    const raw = [
      {
        date: '2026-10-01',
        channel: 'legacy_mixed',
        client_id: 'legacy_unknown',
        platform: 'qqmusic',
        metric: 'parse_success_legacy',
        count: 5,
      },
      {
        date: '2026-10-01',
        channel: 'legacy_mixed',
        client_id: 'legacy_unknown',
        platform: 'qqmusic',
        metric: 'parse_failure_legacy',
        count: 2,
      },
    ];
    const reconciled = reconcileDailyCore(raw);
    const successRow = reconciled.find((r) => r.metric === 'playlist_success');
    const failureRow = reconciled.find((r) => r.metric === 'resolve_failure');
    const requestRow = reconciled.find((r) => r.metric === 'resolve_request');

    expect(successRow?.count).toBe(5);
    expect(failureRow?.count).toBe(2);
    expect(requestRow?.count).toBe(7);
  });

  it('normalizes legacy breakdown latency buckets', () => {
    const rows = [
      {
        date: '2026-10-01',
        channel: 'web',
        client_id: 'official_web',
        platform: 'qqmusic',
        dimension: 'latency_bucket',
        value: '_500ms',
        count: 15,
      },
    ];
    const reconciled = reconcileBreakdownRows(rows);
    expect(reconciled[0].value).toBe('<500ms');
  });

  it('normalizes legacy client environment rows to canonical plugin tokens', () => {
    const env = [
      {
        date: '2026-10-01',
        channel: 'legacy_mixed',
        client_id: 'legacy_unknown',
        device_class: 'desktop',
        browser_family: 'playlistout_musicfree',
        os_family: 'windows',
        count: 4,
      },
    ];
    const reconciled = reconcileClientEnv(env);
    expect(reconciled[0].browser_family).toBe('plugin:musicfree');
    expect(reconciled[0].channel).toBe('plugin');
    expect(reconciled[0].client_id).toBe('musicfree');
  });

  it('builds analytics slice maintaining terminal resolve invariant across full range', () => {
    const slice = buildAnalyticsSlice(mockSnapshot, { from: '2026-10-04', to: '2026-10-05', exclude_my: false });
    const overview = slice.overview;
    expect(overview.resolve_request).toBe(30);
    expect(overview.playlist_success).toBe(23);
    expect(overview.user_success).toBe(3);
    expect(overview.resolve_failure).toBe(4);
    expect(overview.resolve_request).toBe(
      overview.playlist_success + overview.user_success + overview.resolve_failure,
    );

    const check = slice.dataQuality.checks.find((c) => c.id === 'resolve_invariant');
    expect(check?.ok).toBe(true);
  });

  it('supports single day view with hourly breakdown', () => {
    const slice = buildAnalyticsSlice(mockSnapshot, { from: '2026-10-04', to: '2026-10-04', exclude_my: false });
    expect(slice.overview.resolve_request).toBe(10);
    expect(slice.hourlyTimeseries.length).toBe(2);
    expect(slice.hourlyTimeseries[0].hour).toBe(10);
  });

  it('filters feedback slice correctly by status', () => {
    const pendingSlice = buildFeedbackSlice(mockSnapshot, { status: 'pending' });
    expect(pendingSlice.total).toBe(1);
    expect(pendingSlice.entries[0].id).toBe(1);
    expect(pendingSlice.counts.pending).toBe(1);
    expect(pendingSlice.counts.resolved).toBe(1);
    expect(pendingSlice.counts.all).toBe(2);

    const allSlice = buildFeedbackSlice(mockSnapshot, { status: 'all' });
    expect(allSlice.total).toBe(2);
  });

  it('filters quarantine slice by reason', () => {
    const qSlice = buildQuarantineSlice(mockSnapshot, { reason: 'bot_signature' });
    expect(qSlice.totalRecords).toBe(1);
    expect(qSlice.quarantine[0].id).toBe(11);
    expect(qSlice.totalEvents).toBe(12);
  });

  it('aggregates cross-channel DAU with per-client rows, deltas and DAU-scoped geo', () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const snapshot: AnalyticsSnapshot = {
      ...mockSnapshot,
      dailyCore: [
        { date: yesterday, channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 40 },
        { date: today, channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 50 },
        { date: yesterday, channel: 'plugin', client_id: 'musicfree', platform: 'none', metric: 'active_user', count: 9 },
        { date: today, channel: 'plugin', client_id: 'musicfree', platform: 'none', metric: 'active_user', count: 12 },
        { date: today, channel: 'plugin', client_id: 'bbplayer', platform: 'none', metric: 'active_user', count: 3 },
        { date: today, channel: 'cli', client_id: 'official_cli', platform: 'none', metric: 'active_user', count: 5 },
      ],
      hourlyCore: [
        { date: today, hour: 10, metric: 'visitor_unique', count: 5 },
        { date: today, hour: 11, metric: 'active_user', count: 2 },
        { date: today, hour: 11, metric: 'resolve_request', count: 99 },
      ],
      geo: [
        { date: today, channel: 'web', client_id: 'official_web', platform: 'none', country: 'CN', region: 'Guangdong', metric: 'visitor_unique', count: 30 },
        { date: today, channel: 'plugin', client_id: 'musicfree', platform: 'none', country: 'CN', region: 'Zhejiang', metric: 'active_user', count: 4 },
        { date: today, channel: 'web', client_id: 'official_web', platform: 'none', country: 'US', region: 'California', metric: 'resolve_request', count: 77 },
      ],
      breakdowns: [],
      clientEnv: [],
    };

    const slice = buildAnalyticsSlice(snapshot, { from: yesterday, to: today, exclude_my: false });

    expect(slice.overview.visitor_unique).toBe(90);
    expect(slice.overview.active_user).toBe(29);
    expect(slice.dau.today).toEqual({ total: 70, web: 50, plugin: 15, cli: 5 });
    expect(slice.dau.yesterday).toEqual({ total: 49, web: 40, plugin: 9, cli: 0 });
    expect(slice.dau.series).toHaveLength(2);

    expect(slice.dau.clients.find((c) => c.client === 'musicfree')).toMatchObject({
      channel: 'plugin',
      total: 21,
      today: 12,
      yesterday: 9,
    });
    expect(slice.dau.clients.find((c) => c.client === 'bbplayer')).toMatchObject({
      channel: 'plugin',
      total: 3,
      today: 3,
      yesterday: 0,
    });
    expect(slice.dau.clients.find((c) => c.client === 'official_cli')).toMatchObject({
      channel: 'cli',
      total: 5,
      today: 5,
    });

    // DAU geography only includes activity metrics (web visitor_unique + active_user)
    expect(slice.dau.countries.map((c) => c.name)).toEqual(['CN']);
    expect(slice.dau.countries[0].count).toBe(34);
    expect(slice.dau.regions.map((r) => r.name).sort()).toEqual(['Guangdong', 'Zhejiang']);

    // Single-day filter exposes the hourly DAU distribution (non-DAU metrics excluded)
    const singleDay = buildAnalyticsSlice(snapshot, { from: today, to: today, exclude_my: false });
    expect(singleDay.dau.hours).toEqual([
      { hour: 10, total: 5, web: 5, plugin: 0, cli: 0 },
      { hour: 11, total: 2, web: 0, plugin: 2, cli: 0 },
    ]);
  });

  it('supports querying DAU for past single day with correct comparison date data', () => {
    const snapshot: AnalyticsSnapshot = {
      ...mockSnapshot,
      dailyCore: [
        { date: '2026-10-04', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 40 },
        { date: '2026-10-05', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 60 },
        { date: '2026-10-04', channel: 'plugin', client_id: 'musicfree', platform: 'none', metric: 'active_user', count: 10 },
        { date: '2026-10-05', channel: 'plugin', client_id: 'musicfree', platform: 'none', metric: 'active_user', count: 15 },
      ],
      hourlyCore: [],
      geo: [],
      breakdowns: [],
      clientEnv: [],
    };

    // When querying single day 2026-10-05, targetDate is 2026-10-05 and comparisonDate is 2026-10-04
    const slice = buildAnalyticsSlice(snapshot, { from: '2026-10-05', to: '2026-10-05', exclude_my: false });
    expect(slice.dau.targetDate).toBe('2026-10-05');
    expect(slice.dau.comparisonDate).toBe('2026-10-04');
    expect(slice.dau.isSingleDay).toBe(true);
    expect(slice.dau.today).toEqual({ total: 75, web: 60, plugin: 15, cli: 0 });
    expect(slice.dau.yesterday).toEqual({ total: 50, web: 40, plugin: 10, cli: 0 });

    const mf = slice.dau.clients.find((c) => c.client === 'musicfree');
    expect(mf).toMatchObject({
      total: 15,
      today: 15,
      yesterday: 10,
    });
  });

  it('filters feedback slice by platform, date, and status', () => {
    const qqSlice = buildFeedbackSlice(mockSnapshot, { platform: 'qqmusic' });
    expect(qqSlice.total).toBe(1);
    expect(qqSlice.entries[0].platform).toBe('qqmusic');
    expect(qqSlice.counts.pending).toBe(1);
    expect(qqSlice.counts.resolved).toBe(0);

    const neteaseSlice = buildFeedbackSlice(mockSnapshot, { platform: 'netease' });
    expect(neteaseSlice.total).toBe(1);
    expect(neteaseSlice.entries[0].platform).toBe('netease');

    const dateSlice = buildFeedbackSlice(mockSnapshot, { from: '2026-10-05', to: '2026-10-05' });
    expect(dateSlice.total).toBe(1);
    expect(dateSlice.entries[0].id).toBe(2);
  });

  it('filters quarantine slice by platform, country, and date range', () => {
    const customSnapshot: AnalyticsSnapshot = {
      ...mockSnapshot,
      quarantine: [
        { id: 1, incident_date: '2026-10-04', reason: 'bot_ua', platform: 'qqmusic', country: 'CN', count: 5 },
        { id: 2, incident_date: '2026-10-05', reason: 'bot_ua', platform: 'netease', country: 'US', count: 8 },
      ],
    };

    const cnSlice = buildQuarantineSlice(customSnapshot, { country: 'CN' });
    expect(cnSlice.totalRecords).toBe(1);
    expect(cnSlice.quarantine[0].id).toBe(1);

    const neteaseSlice = buildQuarantineSlice(customSnapshot, { platform: 'netease' });
    expect(neteaseSlice.totalRecords).toBe(1);
    expect(neteaseSlice.quarantine[0].id).toBe(2);
  });

  it('defaults missing DAU fields to zero for older snapshots', () => {
    const slice = buildAnalyticsSlice(mockSnapshot, { from: '2026-10-04', to: '2026-10-05', exclude_my: false });
    expect(slice.overview.active_user).toBe(0);
    expect(slice.dau).toMatchObject({
      today: { total: 0, web: 0, plugin: 0, cli: 0 },
      yesterday: { total: 0, web: 0, plugin: 0, cli: 0 },
      windowTotals: { total: 0, web: 0, plugin: 0, cli: 0 },
      series: [],
      hours: [],
      clients: [],
      countries: [],
      regions: [],
    });
  });

  it('does not double count visitor_unique in overview when platform is filtered', () => {
    const customSnapshot: AnalyticsSnapshot = {
      ...mockSnapshot,
      dailyCore: [
        {
          date: '2026-10-05',
          channel: 'web',
          client_id: 'official_web',
          platform: 'none',
          metric: 'visitor_unique',
          count: 50,
        },
        {
          date: '2026-10-05',
          channel: 'web',
          client_id: 'official_web',
          platform: 'qqmusic',
          metric: 'resolve_request',
          count: 10,
        },
      ],
    };
    const slice = buildAnalyticsSlice(customSnapshot, {
      from: '2026-10-05',
      to: '2026-10-05',
      platform: 'qqmusic',
    });
    // overview visitor_unique must stay 50, not 100
    expect(slice.overview.visitor_unique).toBe(50);
    expect(slice.dau.today.total).toBe(50);
  });

  it('supports created_at fallback when filtering feedback by date range', () => {
    const customSnapshot: AnalyticsSnapshot = {
      ...mockSnapshot,
      feedback: [
        {
          id: 101,
          platform: 'qqmusic',
          status: 'pending',
          created_at: '2026-10-05T12:00:00Z',
        } as unknown as FeedbackRow,
        {
          id: 102,
          platform: 'netease',
          status: 'pending',
          created_at: '2026-10-01T12:00:00Z',
        } as unknown as FeedbackRow,
      ],
    };
    const slice = buildFeedbackSlice(customSnapshot, { from: '2026-10-05', to: '2026-10-05' });
    expect(slice.total).toBe(1);
    expect(slice.entries[0].id).toBe(101);
  });
});
