import { describe, it, expect } from 'vitest';
import { handleInternalQuarantine } from './quarantine';
import type { Env } from '../index';

async function mockCompare(a: string, b: string): Promise<boolean> {
  return a === b;
}

describe('handleInternalQuarantine', () => {
  const adminToken = 'secret-test-token-12345';

  it('returns 503 if INSIGHTS_ADMIN_TOKEN is missing in env', async () => {
    const req = new Request('https://api.playlistout.com/api/internal/quarantine', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const env: Env = {};
    const res = await handleInternalQuarantine(req, env, {}, mockCompare);
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('returns 401 if Authorization header is missing', async () => {
    const req = new Request('https://api.playlistout.com/api/internal/quarantine');
    const env: Env = { INSIGHTS_ADMIN_TOKEN: adminToken };
    const res = await handleInternalQuarantine(req, env, {}, mockCompare);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 if Authorization token is invalid', async () => {
    const req = new Request('https://api.playlistout.com/api/internal/quarantine', {
      headers: { Authorization: 'Bearer wrong-token' },
    });
    const env: Env = { INSIGHTS_ADMIN_TOKEN: adminToken };
    const res = await handleInternalQuarantine(req, env, {}, mockCompare);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 405 if HTTP method is not GET', async () => {
    const req = new Request('https://api.playlistout.com/api/internal/quarantine', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const env: Env = { INSIGHTS_ADMIN_TOKEN: adminToken };
    const res = await handleInternalQuarantine(req, env, {}, mockCompare);
    expect(res.status).toBe(405);
  });

  it('returns empty list if DB is undefined or table does not exist', async () => {
    const req = new Request('https://api.playlistout.com/api/internal/quarantine', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const env: Env = { INSIGHTS_ADMIN_TOKEN: adminToken };
    const res = await handleInternalQuarantine(req, env, {}, mockCompare);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: { quarantine: unknown[]; totalRecords: number } };
    expect(body.success).toBe(true);
    expect(body.data.quarantine).toEqual([]);
    expect(body.data.totalRecords).toBe(0);
  });

  it('returns quarantined records when table exists', async () => {
    const mockRows = [
      {
        id: 1,
        incident_date: '2026-10-02',
        batch_id: 'crawler_quarantine_20261002_001',
        source_table: 'daily_geo_stats',
        original_record_id: 'geo_123',
        reason: 'crawler_script_abuse_chengdu_api',
        count: 425,
        raw_payload: '{"country":"CN","city":"Chengdu"}',
        quarantined_at: '2026-10-02T21:00:00Z',
      },
    ];

    const mockSummary = [
      {
        incident_date: '2026-10-02',
        batch_id: 'crawler_quarantine_20261002_001',
        reason: 'crawler_script_abuse_chengdu_api',
        source_table: 'daily_geo_stats',
        records_count: 1,
        total_events: 425,
      },
    ];

    const mockDb: any = {
      prepare(sql: string) {
        return {
          bind(..._args: any[]) {
            return this;
          },
          async first<T = any>() {
            if (sql.includes('sqlite_master')) {
              return { name: 'quarantined_stats' } as T;
            }
            if (sql.includes('SELECT count(*) as total_records')) {
              return { total_records: 1, total_events: 425 } as T;
            }
            return null;
          },
          async all() {
            if (sql.includes('GROUP BY')) {
              return { results: mockSummary };
            }
            return { results: mockRows };
          },
        };
      },
    };

    const req = new Request('https://api.playlistout.com/api/internal/quarantine?reason=crawler_script_abuse_chengdu_api', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const env: Env = { INSIGHTS_ADMIN_TOKEN: adminToken, DB: mockDb };
    const res = await handleInternalQuarantine(req, env, {}, mockCompare);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: {
        quarantine: typeof mockRows;
        summary: typeof mockSummary;
        totalRecords: number;
        totalEvents: number;
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.quarantine.length).toBe(1);
    expect(body.data.quarantine[0].id).toBe(1);
    expect(body.data.totalRecords).toBe(1);
    expect(body.data.totalEvents).toBe(425);
  });
});
