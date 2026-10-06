import { describe, expect, it } from 'vitest';
import { getAnalyticsV2, type AnalyticsV2Filters } from './v2';

function createDb(seenSql: string[] = []): D1Database {
  return {
    prepare(sql: string) {
      seenSql.push(sql);
      let binds: unknown[] = [];
      const statement: any = {
        bind(...args: unknown[]) {
          binds = args;
          return statement;
        },
        async all() {
          if (sql.includes('FROM analytics_v2_hourly_core') && sql.includes('GROUP BY hour, metric')) {
            expect(binds.slice(0, 2)).toEqual(['2026-10-06', '2026-10-06']);
            return {
              results: [
                { hour: 1, metric: 'resolve_request', count: 3 },
                { hour: 1, metric: 'playlist_success', count: 2 },
                { hour: 1, metric: 'resolve_failure', count: 1 },
                { hour: 9, metric: 'resolve_request', count: 4 },
                { hour: 9, metric: 'user_success', count: 4 },
              ],
            };
          }
          if (sql.includes('AS invalid_count')) {
            return { results: [{ invalid_count: 0 }] };
          }
          if (sql.includes('SELECT MAX(date) AS latest_date')) {
            return { results: [{ latest_date: '2026-10-06' }] };
          }
          return { results: [] };
        },
      };
      return statement;
    },
  } as unknown as D1Database;
}

const singleDay: AnalyticsV2Filters = {
  from: '2026-10-06',
  to: '2026-10-06',
};

describe('Analytics V2 maintainer timeseries', () => {
  it('returns UTC hourly buckets for a single-day non-geo query', async () => {
    const result = await getAnalyticsV2(createDb(), singleDay);
    expect(result.hourlyTimeseries).toEqual([
      {
        date: '2026-10-06',
        hour: 1,
        resolve_request: 3,
        playlist_success: 2,
        resolve_failure: 1,
      },
      {
        date: '2026-10-06',
        hour: 9,
        resolve_request: 4,
        user_success: 4,
      },
    ]);
  });

  it('does not fabricate an hourly geo correlation', async () => {
    const result = await getAnalyticsV2(createDb(), {
      ...singleDay,
      country: 'MY',
    });
    expect(result.hourlyTimeseries).toEqual([]);
  });

  it('keeps multi-day queries on daily timeseries only', async () => {
    const result = await getAnalyticsV2(createDb(), {
      from: '2026-10-01',
      to: '2026-10-06',
    });
    expect(result.hourlyTimeseries).toEqual([]);
  });

  it('queries all breakdown dimensions in one grouped statement', async () => {
    const seenSql: string[] = [];
    await getAnalyticsV2(createDb(seenSql), singleDay);
    const breakdownQueries = seenSql.filter(
      (sql) =>
        sql.includes('SELECT dimension, value AS name') &&
        sql.includes('FROM analytics_v2_breakdown'),
    );
    expect(breakdownQueries).toHaveLength(1);
    expect(breakdownQueries[0]).toContain('GROUP BY dimension, value');
  });

});
