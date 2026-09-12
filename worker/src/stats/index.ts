/**
 * Anonymous Product Statistics
 * Governed by docs/PROJECT-CONSTITUTION.md Section 7 & 9
 *
 * STRICT PRIVACY RULES:
 * Never store playlist URLs, playlist IDs, track titles, artists, albums,
 * user identifiers, IP addresses, cookies, or exported files.
 * Only anonymous atomic counters are incremented.
 */

export interface PlatformStat {
  total: number;
  today: number;
}

export interface AggregateStatsData {
  totalSuccessfulParses: number;
  todaySuccessfulParses: number;
  totalFailedParses: number;
  byPlatform: Record<string, PlatformStat>;
}

export function getUtcDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Records an anonymous parse event using atomic upserts.
 * Best-effort: failures never interrupt user workflow.
 */
export async function recordParse(
  db: D1Database | undefined,
  platform: string,
  success: boolean,
): Promise<void> {
  if (!db) {
    return;
  }

  const date = getUtcDateString();
  const metric = success ? 'parse_success' : 'parse_failure';

  const upsertSql = `
    INSERT INTO aggregate_stats (date, platform, metric, count)
    VALUES (?1, ?2, ?3, 1)
    ON CONFLICT (date, platform, metric)
    DO UPDATE SET count = count + 1;
  `;

  try {
    const statements: D1PreparedStatement[] = [
      // Today's per-platform counter
      db.prepare(upsertSql).bind(date, platform, metric),
      // All-time per-platform counter
      db.prepare(upsertSql).bind('TOTAL', platform, metric),
    ];

    if (success) {
      // Global counters for all platforms combined
      statements.push(db.prepare(upsertSql).bind(date, 'all', metric));
      statements.push(db.prepare(upsertSql).bind('TOTAL', 'all', metric));
    }

    await db.batch(statements);
  } catch (err: unknown) {
    // Best-effort guarantee: do not throw or fail the parse request
    console.error('Failed to record anonymous aggregate stats:', err);
  }
}

/**
 * Retrieves aggregate product stats. Returns zeroed structure if DB is unavailable.
 */
export async function getAggregateStats(db: D1Database | undefined): Promise<AggregateStatsData> {
  const defaultStats: AggregateStatsData = {
    totalSuccessfulParses: 0,
    todaySuccessfulParses: 0,
    totalFailedParses: 0,
    byPlatform: {},
  };

  if (!db) {
    return defaultStats;
  }

  const today = getUtcDateString();

  try {
    const rows = await db
      .prepare('SELECT date, platform, metric, count FROM aggregate_stats WHERE date IN (?1, ?2)')
      .bind(today, 'TOTAL')
      .all<{ date: string; platform: string; metric: string; count: number }>();

    if (!rows.results || rows.results.length === 0) {
      return defaultStats;
    }

    let totalSuccess = 0;
    let todaySuccess = 0;
    let totalFailure = 0;
    const byPlatform: Record<string, PlatformStat> = {};

    for (const row of rows.results) {
      const { date, platform, metric, count } = row;

      if (metric === 'parse_success') {
        if (platform === 'all' || (platform === 'qqmusic' && totalSuccess === 0)) {
          if (date === 'TOTAL') totalSuccess = count;
          if (date === today) todaySuccess = count;
        }

        if (platform !== 'all') {
          if (!byPlatform[platform]) {
            byPlatform[platform] = { total: 0, today: 0 };
          }
          if (date === 'TOTAL') byPlatform[platform].total = count;
          if (date === today) byPlatform[platform].today = count;
        }
      } else if (metric === 'parse_failure') {
        if (date === 'TOTAL') {
          totalFailure += count;
        }
      }
    }

    return {
      totalSuccessfulParses: totalSuccess,
      todaySuccessfulParses: todaySuccess,
      totalFailedParses: totalFailure,
      byPlatform,
    };
  } catch (err: unknown) {
    console.error('Failed to fetch aggregate stats:', err);
    return defaultStats;
  }
}
