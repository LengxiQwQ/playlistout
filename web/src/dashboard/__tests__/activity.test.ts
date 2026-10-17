import { describe, expect, it } from 'vitest';
import {
  buildAnalyticsSlice,
  detectDauCoverage,
  generateDauAnnotations,
} from '../engine';
import type { AnalyticsSnapshot } from '../types';

describe('Activity & DAU Engine Redesign', () => {
  const baseSnapshot: AnalyticsSnapshot = {
    version: 2,
    generatedAt: '2026-10-17T14:30:00Z',
    dailyCore: [
      // Web history
      { date: '2026-10-01', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 100 },
      { date: '2026-10-02', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 105 },
      { date: '2026-10-03', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 98 },
      { date: '2026-10-04', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 102 },
      { date: '2026-10-05', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 110 },
      { date: '2026-10-06', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 115 },
      { date: '2026-10-07', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 108 },
      { date: '2026-10-16', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 120 },
      { date: '2026-10-17', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 90 },

      // Plugin telemetry starts from 2026-10-05
      { date: '2026-10-05', channel: 'plugin', client_id: 'musicfree', platform: 'none', metric: 'active_user', count: 40 },
      { date: '2026-10-06', channel: 'plugin', client_id: 'musicfree', platform: 'none', metric: 'active_user', count: 42 },
      { date: '2026-10-07', channel: 'plugin', client_id: 'musicfree', platform: 'none', metric: 'active_user', count: 45 },
      { date: '2026-10-16', channel: 'plugin', client_id: 'musicfree', platform: 'none', metric: 'active_user', count: 50 },
      { date: '2026-10-17', channel: 'plugin', client_id: 'musicfree', platform: 'none', metric: 'active_user', count: 30 },

      // CLI telemetry starts from 2026-10-07
      { date: '2026-10-07', channel: 'cli', client_id: 'playlistout_cli', platform: 'none', metric: 'active_user', count: 10 },
      { date: '2026-10-16', channel: 'cli', client_id: 'playlistout_cli', platform: 'none', metric: 'active_user', count: 12 },
      { date: '2026-10-17', channel: 'cli', client_id: 'playlistout_cli', platform: 'none', metric: 'active_user', count: 8 },
    ],
    hourlyCore: [
      // 2026-10-16 (yesterday)
      { date: '2026-10-16', hour: 8, channel: 'web', client_id: 'official_web', metric: 'visitor_unique', count: 30 },
      { date: '2026-10-16', hour: 10, channel: 'plugin', client_id: 'musicfree', metric: 'active_user', count: 20 },
      { date: '2026-10-16', hour: 12, channel: 'web', client_id: 'official_web', metric: 'visitor_unique', count: 40 },
      { date: '2026-10-16', hour: 14, channel: 'cli', client_id: 'playlistout_cli', metric: 'active_user', count: 10 },
      // Cumulative up to 14:00 on 10-16 is 30 + 20 + 40 + 10 = 100
      { date: '2026-10-16', hour: 20, channel: 'web', client_id: 'official_web', metric: 'visitor_unique', count: 50 },
      { date: '2026-10-16', hour: 21, channel: 'plugin', client_id: 'musicfree', metric: 'active_user', count: 30 },
      { date: '2026-10-16', hour: 22, channel: 'cli', client_id: 'playlistout_cli', metric: 'active_user', count: 2 },
      // Full day 10-16 total: 100 + 82 = 182

      // 2026-10-17 (today, recorded up to 14:00)
      { date: '2026-10-17', hour: 8, channel: 'web', client_id: 'official_web', metric: 'visitor_unique', count: 35 },
      { date: '2026-10-17', hour: 10, channel: 'plugin', client_id: 'musicfree', metric: 'active_user', count: 25 },
      { date: '2026-10-17', hour: 12, channel: 'web', client_id: 'official_web', metric: 'visitor_unique', count: 55 },
      { date: '2026-10-17', hour: 14, channel: 'cli', client_id: 'playlistout_cli', metric: 'active_user', count: 8 },
      // Cumulative up to 14:00 on 10-17 is 35 + 25 + 55 + 8 = 123
    ],
    geo: [],
    breakdowns: [],
    clientEnv: [],
    quarantine: [],
    feedback: [],
  };

  it('1. calculates same-hour comparison for Today vs Yesterday (123 vs 100 at 14:00)', () => {
    const slice = buildAnalyticsSlice(baseSnapshot, { from: '2026-10-17', to: '2026-10-17' });
    const dau = slice.dau;

    expect(dau.isSingleDay).toBe(true);
    expect(dau.targetDate).toBe('2026-10-17');
    expect(dau.comparisonDate).toBe('2026-10-16');

    const comp = dau.comparison!;
    expect(comp.isSameHour).toBe(true);
    expect(comp.currentHour).toBe(14);
    expect(comp.targetCount).toBe(123);
    expect(comp.comparisonCount).toBe(100);
    expect(comp.deltaCount).toBe(23);
    expect(comp.deltaPercent).toBe(23.0); // +23%
    expect(comp.comparable).toBe(true);
  });

  it('2. converts hourly increments to cumulative series and leaves future hours null for today', () => {
    const slice = buildAnalyticsSlice(baseSnapshot, { from: '2026-10-17', to: '2026-10-17' });
    const single = slice.dau.singleDay!;

    expect(single.targetCumulative).toHaveLength(24);

    // Hour 7: 0
    expect(single.targetCumulative[7].targetTotal).toBe(0);
    // Hour 8: 35
    expect(single.targetCumulative[8].targetTotal).toBe(35);
    // Hour 10: 35 + 25 = 60
    expect(single.targetCumulative[10].targetTotal).toBe(60);
    // Hour 12: 60 + 55 = 115
    expect(single.targetCumulative[12].targetTotal).toBe(115);
    // Hour 14: 115 + 8 = 123
    expect(single.targetCumulative[14].targetTotal).toBe(123);

    // Future hours (15..23) must be null, NOT 0!
    for (let h = 15; h < 24; h++) {
      expect(single.targetCumulative[h].targetTotal).toBeNull();
      expect(single.targetCumulative[h].isFuture).toBe(true);
    }

    // Comparison day (yesterday) has full 24h curve
    expect(single.targetCumulative[14].comparisonTotal).toBe(100);
    expect(single.targetCumulative[23].comparisonTotal).toBe(182);
  });

  it('3. differentiates Single-Day mode from Multi-Day trend mode', () => {
    const single = buildAnalyticsSlice(baseSnapshot, { from: '2026-10-16', to: '2026-10-16' });
    expect(single.dau.isSingleDay).toBe(true);
    expect(single.dau.singleDay).toBeDefined();
    expect(single.dau.multiDay).toBeUndefined();

    const multi = buildAnalyticsSlice(baseSnapshot, { from: '2026-10-01', to: '2026-10-07' });
    expect(multi.dau.isSingleDay).toBe(false);
    expect(multi.dau.singleDay).toBeUndefined();
    expect(multi.dau.multiDay).toBeDefined();
    expect(multi.dau.multiDay!.dayCount).toBe(7);
  });

  it('4. computes previous-period comparison in Multi-Day mode', () => {
    // Range 2026-10-05 to 2026-10-07 (3 days)
    const slice = buildAnalyticsSlice(baseSnapshot, { from: '2026-10-05', to: '2026-10-07' });
    const multi = slice.dau.multiDay!;

    expect(multi.dayCount).toBe(3);
    expect(multi.previousPeriodFrom).toBe('2026-10-02');
    expect(multi.previousPeriodTo).toBe('2026-10-04');
    expect(multi.previousPeriodSeries).toHaveLength(3);
    expect(slice.dau.comparison!.label).toContain('上一周期');
  });

  it('5. includes Web, Plugin, and CLI as first-class client rows with breakdown', () => {
    const slice = buildAnalyticsSlice(baseSnapshot, { from: '2026-10-17', to: '2026-10-17' });
    const clients = slice.dau.clients;

    const webClient = clients.find((c) => c.client === 'official_web');
    expect(webClient).toBeDefined();
    expect(webClient!.channel).toBe('web');
    expect(webClient!.today).toBe(90);

    const pluginClient = clients.find((c) => c.client === 'musicfree');
    expect(pluginClient).toBeDefined();
    expect(pluginClient!.channel).toBe('plugin');
    expect(pluginClient!.today).toBe(30);

    const cliClient = clients.find((c) => c.client === 'playlistout_cli');
    expect(cliClient).toBeDefined();
    expect(cliClient!.channel).toBe('cli');
    expect(cliClient!.today).toBe(8);
  });

  it('6. detects dynamic coverage and flags uncollected dates before coverage start', () => {
    const coverage = detectDauCoverage(baseSnapshot.dailyCore);
    expect(coverage.web.earliestDate).toBe('2026-10-01');
    expect(coverage.plugin.earliestDate).toBe('2026-10-05');
    expect(coverage.cli.earliestDate).toBe('2026-10-07');

    const annotations = generateDauAnnotations(coverage);
    expect(annotations.some((a) => a.title.includes('插件'))).toBe(true);
    expect(annotations.some((a) => a.title.includes('CLI'))).toBe(true);

    const slice = buildAnalyticsSlice(baseSnapshot, { from: '2026-10-01', to: '2026-10-07' });
    const day4 = slice.dau.series.find((s) => s.date === '2026-10-04')!;
    expect(day4.pluginUncollected).toBe(true);
    expect(day4.cliUncollected).toBe(true);
    expect(day4.webUncollected).toBe(false);
  });

  it('7. flags comparison as incomparable when comparing across coverage boundaries', () => {
    // 2026-10-05 is when plugin started. Comparison date is 2026-10-04 (plugin uncollected).
    const slice = buildAnalyticsSlice(baseSnapshot, { from: '2026-10-05', to: '2026-10-05' });
    const comp = slice.dau.comparison!;

    expect(comp.comparable).toBe(false);
    expect(comp.deltaPercent).toBeNull();
    expect(comp.incomparableReason).toContain('统计覆盖发生变化');
  });

  it('8. derives peak hour for first active user additions', () => {
    const slice = buildAnalyticsSlice(baseSnapshot, { from: '2026-10-17', to: '2026-10-17' });
    const peak = slice.dau.singleDay!.peakHour;

    expect(peak).toBeDefined();
    // At hour 12: 55 additions (highest)
    expect(peak!.hour).toBe(12);
    expect(peak!.count).toBe(55);
  });

  it('9. ensures Platform filter does not zero out platform-agnostic DAU', () => {
    const slice = buildAnalyticsSlice(baseSnapshot, { from: '2026-10-16', to: '2026-10-16', platform: 'qqmusic' });
    expect(slice.dau.today.total).toBe(182); // 120 web + 50 plugin + 12 cli
    expect(slice.dau.today.web).toBe(120);
    expect(slice.dau.today.plugin).toBe(50);
    expect(slice.dau.today.cli).toBe(12);
  });

  it('10. gracefully degrades for older snapshots missing active_user or hourlyCore', () => {
    const legacySnapshot: AnalyticsSnapshot = {
      version: 2,
      dailyCore: [
        { date: '2026-09-01', channel: 'web', client_id: 'official_web', platform: 'qqmusic', metric: 'resolve_request', count: 10 },
      ],
      hourlyCore: [],
      geo: [],
      breakdowns: [],
      clientEnv: [],
      quarantine: [],
      feedback: [],
    };

    const slice = buildAnalyticsSlice(legacySnapshot, { from: '2026-09-01', to: '2026-09-01' });
    expect(slice.dau.today.total).toBe(0);
    expect(slice.dau.singleDay!.targetCumulative).toHaveLength(24);
    expect(slice.dau.coverage!.plugin.hasCoverage).toBe(false);
    expect(slice.dau.coverage!.cli.hasCoverage).toBe(false);
  });

  it('11. computes accurate same-hour targetCount and comparisonCount per client without contamination', () => {
    const slice = buildAnalyticsSlice(baseSnapshot, { from: '2026-10-17', to: '2026-10-17' });
    const clients = slice.dau.clients;

    const webRow = clients.find((c) => c.client === 'official_web')!;
    const mfRow = clients.find((c) => c.client === 'musicfree')!;
    const cliRow = clients.find((c) => c.client === 'playlistout_cli')!;

    expect(webRow).toBeDefined();
    expect(mfRow).toBeDefined();
    expect(cliRow).toBeDefined();

    // At hour 14 on 2026-10-17:
    // Web: 35 (h8) + 55 (h12) = 90
    // Web yesterday at h14: 30 (h8) + 40 (h12) = 70
    expect(webRow.targetCount).toBe(90);
    expect(webRow.comparisonCount).toBe(70);
    expect(webRow.deltaCount).toBe(20);

    // MusicFree: 25 (h10)
    // MusicFree yesterday at h14: 20 (h10)
    expect(mfRow.targetCount).toBe(25);
    expect(mfRow.comparisonCount).toBe(20);
    expect(mfRow.deltaCount).toBe(5);
    expect(mfRow.deltaPercent).toBe(25.0);

    // CLI: 8 (h14)
    // CLI yesterday at h14: 10 (h14)
    expect(cliRow.targetCount).toBe(8);
    expect(cliRow.comparisonCount).toBe(10);
    expect(cliRow.deltaCount).toBe(-2);
    expect(cliRow.deltaPercent).toBe(-20.0);
  });

  it('12. enforces fair cutoff to latest completed full hour when current clock hour is in-progress', () => {
    // Snapshot generated at 07:13 UTC on 2026-10-17; hourly data only exists up to hour 6
    const partialHourSnapshot: AnalyticsSnapshot = {
      ...baseSnapshot,
      generatedAt: '2026-10-17T07:13:00Z',
      hourlyCore: [
        { date: '2026-10-16', hour: 4, channel: 'web', client_id: 'official_web', metric: 'visitor_unique', count: 10 },
        { date: '2026-10-16', hour: 6, channel: 'web', client_id: 'official_web', metric: 'visitor_unique', count: 15 },
        { date: '2026-10-17', hour: 4, channel: 'web', client_id: 'official_web', metric: 'visitor_unique', count: 12 },
        { date: '2026-10-17', hour: 6, channel: 'web', client_id: 'official_web', metric: 'visitor_unique', count: 18 },
      ],
    };

    const slice = buildAnalyticsSlice(partialHourSnapshot, { from: '2026-10-17', to: '2026-10-17' });
    const comp = slice.dau.comparison!;

    expect(comp.isSameHour).toBe(true);
    expect(comp.currentHour).toBe(7);
    expect(comp.effectiveHour).toBe(6);
    expect(comp.isLatestFullHour).toBe(true);
    expect(comp.targetCount).toBe(30); // 12 + 18 up to 06:00
    expect(comp.comparisonCount).toBe(25); // 10 + 15 up to 06:00
    expect(comp.deltaCount).toBe(5);
    expect(comp.label).toContain('00:00~06:00');
  });

  it('13. provides fair completed-day baselines in multi-day mode when range includes today', () => {
    const multiDaySnapshot: AnalyticsSnapshot = {
      ...baseSnapshot,
      dailyCore: [
        { date: '2026-10-11', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 100 },
        { date: '2026-10-12', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 110 },
        { date: '2026-10-13', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 120 },
        { date: '2026-10-14', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 130 },
        { date: '2026-10-15', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 140 },
        { date: '2026-10-16', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 182 },
        { date: '2026-10-17', channel: 'web', client_id: 'official_web', platform: 'none', metric: 'visitor_unique', count: 90 }, // today, partial
      ],
    };

    // Range includes today (2026-10-17)
    const slice = buildAnalyticsSlice(multiDaySnapshot, { from: '2026-10-11', to: '2026-10-17' });
    const multi = slice.dau.multiDay!;

    expect(multi.rangeIncludesToday).toBe(true);
    // Latest full day should be yesterday (10-16), not partial today
    expect(multi.latestFullDay?.date).toBe('2026-10-16');
    expect(multi.latestFullDay?.total).toBe(182);

    // Full day count excludes partial today (6 full days: 10-11 to 10-16)
    expect(multi.fullDayCount).toBe(6);
    expect(multi.previousPeriodSeries).toBeDefined();
    expect(multi.previousPeriodSeries.length).toBe(6);
  });

  it('14. calculates moving average dividing only by valid observed days without cold start depression', () => {
    const slice = buildAnalyticsSlice(baseSnapshot, { from: '2026-10-01', to: '2026-10-07' });
    const pt1 = slice.dau.series.find((p) => p.date === '2026-10-01')!;
    // On Day 1 (2026-10-01), only 1 day of history exists (100). MA7 must be 100, NOT 100/7 = 14!
    expect(pt1.ma7).toBe(100);

    const pt2 = slice.dau.series.find((p) => p.date === '2026-10-02')!;
    // On Day 2, avg of 100 and 105 is 103 (rounded)
    expect(pt2.ma7).toBe(103);
  });

  it('15. computes period daily averages for clients in multi-day mode', () => {
    const slice = buildAnalyticsSlice(baseSnapshot, { from: '2026-10-06', to: '2026-10-07' });
    const clients = slice.dau.clients;

    const webRow = clients.find((c) => c.client === 'official_web')!;
    expect(webRow.currentPeriodDailyAvg).toBeDefined();
    expect(webRow.previousPeriodDailyAvg).toBeDefined();
    // In multi-day mode, targetCount holds currentPeriodDailyAvg and comparisonCount holds previousPeriodDailyAvg
    expect(webRow.targetCount).toBe(webRow.currentPeriodDailyAvg);
    expect(webRow.comparisonCount).toBe(webRow.previousPeriodDailyAvg);
  });
});

