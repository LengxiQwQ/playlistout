/**
 * PlaylistOut public statistics entry point.
 *
 * Analytics V2 is the only production analytics backend. Legacy V1 readers
 * and writers were retired by migration 0014.
 */

import type { PublicStatsResponse } from '../analytics/types';
import { getPublicStatsV2Cutover } from './public-v2';

export function getUtcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function getPublicStats(
  db: D1Database | undefined,
): Promise<PublicStatsResponse> {
  const stats = await getPublicStatsV2Cutover(db);

  if (!stats) {
    throw new Error('Analytics V2 public statistics are unavailable before a frozen cutover.');
  }

  return stats;
}
