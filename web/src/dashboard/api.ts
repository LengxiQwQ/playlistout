/**
 * API client for PlaylistOut Maintainer Dashboard
 */

import { API_BASE_URL, REMOTE_API_BASE_URL } from '../api/client';
import type { AnalyticsSnapshot } from './types';

export class DashboardApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = 'DASHBOARD_API_ERROR', status = 500) {
    super(message);
    this.name = 'DashboardApiError';
    this.code = code;
    this.status = status;
  }
}

export async function fetchSnapshot(token: string): Promise<AnalyticsSnapshot> {
  const tryUrls = [
    `${API_BASE_URL}/api/internal/analytics/v2/snapshot`,
    ...(import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL
      ? [`${REMOTE_API_BASE_URL}/api/internal/analytics/v2/snapshot`]
      : []),
  ];

  let lastError: Error | null = null;
  for (const url of tryUrls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        let errCode = 'UPSTREAM_ERROR';
        try {
          const body = await res.json();
          if (body.error?.message) errMsg = body.error.message;
          if (body.error?.code) errCode = body.error.code;
        } catch {
          // Non-JSON error body
        }
        throw new DashboardApiError(errMsg, errCode, res.status);
      }

      const body = await res.json();
      if (!body.success || !body.data) {
        throw new DashboardApiError(body.error?.message || 'Snapshot response invalid', body.error?.code || 'INVALID_SNAPSHOT');
      }

      return body.data as AnalyticsSnapshot;
    } catch (err) {
      lastError = err as Error;
      if (err instanceof DashboardApiError && (err.status === 401 || err.status === 403)) {
        throw err;
      }
    }
  }

  throw lastError || new DashboardApiError('Failed to fetch snapshot from all available endpoints', 'NETWORK_ERROR');
}

export async function updateFeedbackStatus(token: string, id: number, status: string): Promise<void> {
  const url = `${API_BASE_URL}/api/internal/feedback?id=${encodeURIComponent(id)}&status=${encodeURIComponent(status)}`;
  const fallbackUrl = `${REMOTE_API_BASE_URL}/api/internal/feedback?id=${encodeURIComponent(id)}&status=${encodeURIComponent(status)}`;

  const tryUrls = [
    url,
    ...(import.meta.env.DEV && !import.meta.env.VITE_API_BASE_URL ? [fallbackUrl] : []),
  ];

  let lastError: Error | null = null;
  for (const targetUrl of tryUrls) {
    try {
      const res = await fetch(targetUrl, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body.error?.message) msg = body.error.message;
        } catch {
          // ignore
        }
        throw new DashboardApiError(msg, 'FEEDBACK_UPDATE_FAILED', res.status);
      }

      const body = await res.json();
      if (!body.success) {
        throw new DashboardApiError(body.error?.message || 'Update feedback failed', 'FEEDBACK_UPDATE_FAILED');
      }

      return;
    } catch (err) {
      lastError = err as Error;
      if (err instanceof DashboardApiError && (err.status === 401 || err.status === 403)) {
        throw err;
      }
    }
  }

  throw lastError || new DashboardApiError('Failed to update feedback status', 'NETWORK_ERROR');
}
