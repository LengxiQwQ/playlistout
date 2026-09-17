import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StatsJournal } from './StatsJournal';
import * as client from '../../api/client';
import { LanguageProvider } from '../../i18n';

describe('StatsJournal Component (Phase 7)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
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
    expect(screen.getByText('QQ 音乐')).toBeInTheDocument();
    expect(screen.getByText('网易云音乐')).toBeInTheDocument();

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

  describe('Uptime Authenticity & Render Contract (R1.2)', () => {
    const FIXED_TODAY = '2026-09-18';
    const mockBaseStats = (overrides?: Partial<client.StatsResponse>): client.StatsResponse => ({
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
      ...overrides,
    });

    it('renders authentic running days for valid launch date (Test 1)', async () => {
      vi.spyOn(client, 'fetchStats').mockResolvedValueOnce({
        success: true,
        data: mockBaseStats({ launchedAt: '2026-09-12' }),
      });

      render(
        <LanguageProvider defaultLanguage="zh-CN">
          <StatsJournal today={FIXED_TODAY} />
        </LanguageProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByText('✦ 温暖相伴 · 第 7 天 ✦')).toHaveLength(2);
      });
    });

    it('uses canonical metadata when launchedAt is missing/undefined (Test 2)', async () => {
      const dataWithoutLaunch = mockBaseStats();
      delete (dataWithoutLaunch as any).launchedAt;

      vi.spyOn(client, 'fetchStats').mockResolvedValueOnce({
        success: true,
        data: dataWithoutLaunch,
      });

      render(
        <LanguageProvider defaultLanguage="zh-CN">
          <StatsJournal today={FIXED_TODAY} />
        </LanguageProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByText('✦ 温暖相伴 · 第 7 天 ✦')).toHaveLength(2);
      });
    });

    it('renders unavailable fallback when launchedAt is empty string without falling back to canonical (Test 3 & Test 7)', async () => {
      vi.spyOn(client, 'fetchStats').mockResolvedValueOnce({
        success: true,
        data: mockBaseStats({ launchedAt: '' }),
      });

      const { container } = render(
        <LanguageProvider defaultLanguage="zh-CN">
          <StatsJournal today={FIXED_TODAY} />
        </LanguageProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByText('✦ 运行时间暂无数据 ✦')).toHaveLength(2);
      });

      expect(container.textContent).not.toMatch(/第 1 天/);
      expect(container.textContent).not.toMatch(/运行 1 天/);
      expect(container.textContent).not.toMatch(/1 Day/);
      expect(container.textContent).not.toMatch(/NaN/);
      expect(container.textContent).not.toMatch(/Invalid Date/);
    });

    it('renders unavailable fallback when launchedAt is malformed (Test 4 & Test 7)', async () => {
      vi.spyOn(client, 'fetchStats').mockResolvedValueOnce({
        success: true,
        data: mockBaseStats({ launchedAt: 'abc' }),
      });

      const { container } = render(
        <LanguageProvider defaultLanguage="zh-CN">
          <StatsJournal today={FIXED_TODAY} />
        </LanguageProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByText('✦ 运行时间暂无数据 ✦')).toHaveLength(2);
      });

      expect(container.textContent).not.toMatch(/第 1 天/);
      expect(container.textContent).not.toMatch(/运行 1 天/);
      expect(container.textContent).not.toMatch(/1 Day/);
      expect(container.textContent).not.toMatch(/NaN/);
      expect(container.textContent).not.toMatch(/Invalid Date/);
    });

    it('renders unavailable fallback when launchedAt is impossible date 2026-02-31 without rollover (Test 5 & Test 7)', async () => {
      vi.spyOn(client, 'fetchStats').mockResolvedValueOnce({
        success: true,
        data: mockBaseStats({ launchedAt: '2026-02-31' }),
      });

      const { container } = render(
        <LanguageProvider defaultLanguage="zh-CN">
          <StatsJournal today={FIXED_TODAY} />
        </LanguageProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByText('✦ 运行时间暂无数据 ✦')).toHaveLength(2);
      });

      expect(container.textContent).not.toMatch(/第 1 天/);
      expect(container.textContent).not.toMatch(/运行 1 天/);
      expect(container.textContent).not.toMatch(/1 Day/);
      expect(container.textContent).not.toMatch(/NaN/);
      expect(container.textContent).not.toMatch(/Invalid Date/);
    });

    it('renders unavailable fallback when launchedAt is future date 2099-01-01 without clamping to 1 (Test 6 & Test 7)', async () => {
      vi.spyOn(client, 'fetchStats').mockResolvedValueOnce({
        success: true,
        data: mockBaseStats({ launchedAt: '2099-01-01' }),
      });

      const { container } = render(
        <LanguageProvider defaultLanguage="zh-CN">
          <StatsJournal today={FIXED_TODAY} />
        </LanguageProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByText('✦ 运行时间暂无数据 ✦')).toHaveLength(2);
      });

      expect(container.textContent).not.toMatch(/第 1 天/);
      expect(container.textContent).not.toMatch(/运行 1 天/);
      expect(container.textContent).not.toMatch(/1 Day/);
      expect(container.textContent).not.toMatch(/NaN/);
      expect(container.textContent).not.toMatch(/Invalid Date/);
    });

    it('renders English unavailable fallback when language is en-US and date is invalid', async () => {
      vi.spyOn(client, 'fetchStats').mockResolvedValueOnce({
        success: true,
        data: mockBaseStats({ launchedAt: '2099-01-01' }),
      });

      const { container } = render(
        <LanguageProvider defaultLanguage="en-US">
          <StatsJournal today={FIXED_TODAY} />
        </LanguageProvider>,
      );

      await waitFor(() => {
        expect(screen.getAllByText('✦ Uptime unavailable ✦')).toHaveLength(2);
      });

      expect(container.textContent).not.toMatch(/1 Day/);
      expect(container.textContent).not.toMatch(/1 days/);
      expect(container.textContent).not.toMatch(/NaN/);
      expect(container.textContent).not.toMatch(/Invalid Date/);
    });
  });
});
