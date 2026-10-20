import { describe, expect, it } from 'vitest';
import { getBrandColor, formatHumanLabel, DashboardApp } from '../main';
import { buildFeedbackSlice, buildAnalyticsSlice } from '../engine';
import type { AnalyticsSnapshot, FeedbackRow } from '../types';

describe('Dashboard Null & Undefined Tolerance (Regression Tests)', () => {
  describe('getBrandColor safety', () => {
    it('handles null without throwing TypeError (reading toLowerCase)', () => {
      expect(() => getBrandColor(null)).not.toThrow();
      expect(getBrandColor(null)).toBe('#94a3b8');
    });

    it('handles undefined without throwing', () => {
      expect(() => getBrandColor(undefined)).not.toThrow();
      expect(getBrandColor(undefined)).toBe('#94a3b8');
    });

    it('handles empty string and whitespace without throwing', () => {
      expect(getBrandColor('')).toBe('#94a3b8');
      expect(getBrandColor('   ')).toBe('#94a3b8');
    });

    it('resolves known platform and country colors correctly', () => {
      expect(getBrandColor('qqmusic')).toBe('#10b981');
      expect(getBrandColor('QQMUSIC')).toBe('#10b981');
      expect(getBrandColor('netease')).toBe('#ef4444');
      expect(getBrandColor('CN')).toBe('#de2910');
    });
  });

  describe('formatHumanLabel safety', () => {
    it('handles null, undefined, and empty string without returning null or throwing', () => {
      expect(formatHumanLabel(null)).toBe('—');
      expect(formatHumanLabel(undefined)).toBe('—');
      expect(formatHumanLabel('')).toBe('—');
      expect(formatHumanLabel('   ')).toBe('—');
    });

    it('resolves known platform and client labels correctly', () => {
      expect(formatHumanLabel('qqmusic')).toBe('QQ 音乐');
      expect(formatHumanLabel('official_web')).toBe('Playlist Out Web');
      expect(formatHumanLabel('musicfree')).toBe('MusicFree 插件');
    });
  });

  describe('Feedback data slice with null platform and url fallback', () => {
    const rawFeedbackWithNulls: FeedbackRow[] = [
      {
        id: 1,
        platform: null,
        url: 'https://example.com/failed-1',
        error_code: 'UNSUPPORTED_URL',
        status: 'pending',
        report_count: 3,
        first_reported_at: '2026-10-20T10:00:00Z',
        last_reported_at: '2026-10-20T12:00:00Z',
      },
      {
        id: 2,
        platform: 'qqmusic',
        source_url: 'https://y.qq.com/n/ryqq/playlist/123',
        error_code: null,
        status: 'resolved',
        report_count: 1,
        first_reported_at: '2026-10-19T10:00:00Z',
        last_reported_at: '2026-10-19T10:00:00Z',
      },
    ];

    const snapshotWithNullFeedback: AnalyticsSnapshot = {
      version: 2,
      generatedAt: '2026-10-21T00:00:00Z',
      dailyCore: [],
      hourlyCore: [],
      breakdowns: [],
      geo: [],
      clientEnv: [],
      feedback: rawFeedbackWithNulls,
      quarantine: [],
    };

    it('buildFeedbackSlice runs smoothly without throwing on null platform/error_code', () => {
      expect(() => {
        const slice = buildFeedbackSlice(snapshotWithNullFeedback, {});
        expect(slice.entries.length).toBe(2);
        expect(slice.stats?.uniqueUrls).toBe(2);
        expect(slice.counts.pending).toBe(1);
        expect(slice.counts.resolved).toBe(1);
      }).not.toThrow();
    });

    it('buildAnalyticsSlice runs without throwing when feedback contains null fields', () => {
      expect(() => {
        const slice = buildAnalyticsSlice(snapshotWithNullFeedback, {});
        expect(slice.overview.pending_feedback).toBe(1);
      }).not.toThrow();
    });

    it('DashboardApp renders feedback and overview smoothly without crashing', () => {
      const container = document.createElement('div');
      container.id = 'app';
      document.body.appendChild(container);

      const app = new DashboardApp(container);
      (app as any).snapshot = snapshotWithNullFeedback;
      (app as any).token = 'mock_valid_token';

      expect(() => {
        (app as any).renderDashboard();
      }).not.toThrow();

      // Check that the feedback row with null platform rendered with fallback label and color
      const feedbackRows = container.querySelector('#feedbackRows');
      expect(feedbackRows).not.toBeNull();
      expect(feedbackRows?.innerHTML).toContain('未识别平台');
      expect(feedbackRows?.innerHTML).toContain('https://example.com/failed-1');

      container.remove();
    });
  });
});
