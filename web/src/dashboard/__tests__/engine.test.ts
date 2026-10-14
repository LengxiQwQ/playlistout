import { describe, expect, it } from 'vitest';
import {
  buildAnalyticsSlice,
  buildFeedbackSlice,
  buildQuarantineSlice,
  reconcileBreakdownRows,
  reconcileClientEnv,
  reconcileDailyCore,
} from '../engine';
import type { AnalyticsSnapshot } from '../types';

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
});
