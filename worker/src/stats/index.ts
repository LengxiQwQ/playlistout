/**
 * Anonymous Product Statistics (P0 Skeleton)
 * Reserved for Phase 5 implementation using Cloudflare D1.
 *
 * Strict constitutional rule (docs/PROJECT-CONSTITUTION.md Section 7):
 * Never store playlist URLs, song titles, or user identifying information.
 */
export interface StatsTracker {
  recordParse(platform: string, success: boolean): Promise<void>;
}

export const noopStatsTracker: StatsTracker = {
  async recordParse(): Promise<void> {
    // No-op in P0 skeleton
  },
};
