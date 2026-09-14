import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StatsJournal } from './StatsJournal';
import * as client from '../../api/client';
import { LanguageProvider } from '../../i18n';

describe('StatsJournal Component (Phase 7)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders aggregate numbers from /api/stats when API succeeds', async () => {
    vi.spyOn(client, 'fetchStats').mockResolvedValueOnce({
      success: true,
      data: {
        launchedAt: '2026-09-12',
        totalVisitors: 888,
        visitorsToday: 66,
        totalPageViews: 2500,
        pageViewsToday: 180,
        totalPlaylistsParsed: 12842,
        playlistsParsedToday: 326,
        totalTracksProcessed: 382000,
        tracksProcessedToday: 8921,
        totalExports: 4200,
        exportsToday: 95,
        exportFormatsBreakdown: { xlsx: 200, csv: 100, txt: 50, json: 20 },
        byPlatform: {
          qqmusic: { totalSuccess: 12842, todaySuccess: 326 },
        },
        recentDays: [],
        generatedAt: '2026-09-13T00:00:00.000Z',
      },
    });

    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <StatsJournal />
      </LanguageProvider>,
    );

    expect(screen.getByText('今日记录')).toBeInTheDocument();
    expect(screen.getByText('累计手账')).toBeInTheDocument();
    expect(screen.getByText('来自哪里？')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('66')).toBeInTheDocument();
      expect(screen.getByText('888')).toBeInTheDocument();
      expect(screen.getByText('326')).toBeInTheDocument();
      expect(screen.getByText('8,921')).toBeInTheDocument();
      expect(screen.getByText('12,842')).toBeInTheDocument();
      expect(screen.getByText('382,000')).toBeInTheDocument();
      expect(screen.getByText('95')).toBeInTheDocument();
      expect(screen.getByText('4,200')).toBeInTheDocument();
    });
  });

  it('handles API failure gracefully without crashing and displays zero state', async () => {
    vi.spyOn(client, 'fetchStats').mockRejectedValueOnce(new Error('Network error'));

    render(
      <LanguageProvider defaultLanguage="zh-CN">
        <StatsJournal />
      </LanguageProvider>,
    );

    expect(screen.getByText('PlaylistOut 手账统计')).toBeInTheDocument();
    expect(screen.getByText('今日记录')).toBeInTheDocument();
  });
});
