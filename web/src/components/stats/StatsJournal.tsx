import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchStats, type StatsResponse, type StatsIncrementDetail } from '../../api/client';
import { useTranslation } from '../../i18n';
import { Paper } from '../ui/Paper';
import { Sticker } from '../ui/Sticker';
import { PLATFORMS, getPlatformName } from '../../utils/platform';
import { calculateRunningDays } from '../../utils/uptime';
import { AnimatedCounter } from './AnimatedCounter';
import { RunningDaysStamp, type RunningDaysStampProps } from './RunningDaysStamp';

export { RunningDaysStamp, type RunningDaysStampProps };

export interface StatsJournalProps {
  today?: Date | string;
}

export const StatsJournal: React.FC<StatsJournalProps> = ({ today }) => {
  const { t, format: formatString, language } = useTranslation();
  const [stats, setStats] = useState<StatsResponse | null>(null);

  const refreshStats = useCallback(() => {
    fetchStats()
      .then((res) => {
        if (res.success) {
          setStats(res.data);
          window.dispatchEvent(
            new CustomEvent('playlistout:stats-launched-at', {
              detail: { launchedAt: res.data.launchedAt },
            }),
          );
        }
      })
      .catch(() => {
        // Non-blocking best-effort: silently handle network/API failures
      });
  }, []);

  useEffect(() => {
    // Initial fetch (the only full refetch besides the slow background poll)
    refreshStats();

    // Bump displayed counters locally after recorded events; no refetch
    const handleIncrement = (event: Event) => {
      const detail = (event as CustomEvent<StatsIncrementDetail>).detail;
      if (!detail) return;
      setStats((prev) => {
        // If the initial fetch has not landed yet, ignore: it will include the event.
        if (!prev) return prev;
        const next = { ...prev };
        if (detail.kind === 'visit') {
          next.visitorsToday = prev.visitorsToday + 1;
          next.cumulativeDailyVisitors = (prev.cumulativeDailyVisitors ?? 0) + 1;
          next.totalVisitors = prev.totalVisitors + 1;
          next.pageViewsToday = prev.pageViewsToday + 1;
          next.totalPageViews = prev.totalPageViews + 1;
        } else if (detail.kind === 'parse') {
          next.playlistsParsedToday = prev.playlistsParsedToday + 1;
          next.totalPlaylistsParsed = prev.totalPlaylistsParsed + 1;
          const addedTracks = detail.trackCount ?? 0;
          next.tracksProcessedToday = prev.tracksProcessedToday + addedTracks;
          next.totalTracksProcessed = prev.totalTracksProcessed + addedTracks;
        } else if (detail.kind === 'export') {
          next.exportsToday = prev.exportsToday + 1;
          next.totalExports = prev.totalExports + 1;
        }
        return next;
      });
    };
    window.addEventListener('playlistout:stats-increment', handleIncrement);

    // Slow background poll while the tab is visible (5 minutes); the server also
    // edge-caches the response. No refresh on tab switch and no fast polling.
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshStats();
      }
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('playlistout:stats-increment', handleIncrement);
      clearInterval(interval);
    };
  }, [refreshStats]);

  const todayDateFormatted = useMemo(() => {
    const d = today ? (typeof today === 'string' ? new Date(`${today}T00:00:00Z`) : today) : new Date();
    return d.toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'long',
      timeZone: typeof today === 'string' ? 'UTC' : undefined,
    });
  }, [today, language]);

  // Calculate genuine operation days from launch date
  const runningDays = useMemo(() => {
    return calculateRunningDays(stats?.launchedAt, today);
  }, [stats?.launchedAt, today]);

  const visitorsToday = stats?.visitorsToday ?? 0;
  const parsedToday = stats?.playlistsParsedToday ?? 0;
  const tracksToday = stats?.tracksProcessedToday ?? 0;
  const exportsToday = stats?.exportsToday ?? 0;

  // Prefer canonical cumulativeDailyVisitors, with fallback to legacy totalVisitors alias
  const cumulativeDailyVisitors = stats?.cumulativeDailyVisitors ?? stats?.totalVisitors ?? 0;
  const parsedTotal = stats?.totalPlaylistsParsed ?? 0;
  const tracksTotal = stats?.totalTracksProcessed ?? 0;
  const totalExports = stats?.totalExports ?? 0;

  // Format preference calculation
  const formatStats = useMemo(() => {
    const raw = stats?.exportFormatsBreakdown || {};
    const xlsx = raw.xlsx || 0;
    const csv = raw.csv || 0;
    const txt = raw.txt || 0;
    const json = raw.json || 0;
    const m3u8 = raw.m3u8 || 0;
    const markdown = raw.markdown || 0;
    const sum = xlsx + csv + txt + json + m3u8 + markdown;
    if (sum === 0) {
      return { xlsx: 0, csv: 0, txt: 0, json: 0, m3u8: 0, markdown: 0, hasRealData: false };
    }
    return {
      xlsx: Math.round((xlsx / sum) * 100),
      csv: Math.round((csv / sum) * 100),
      txt: Math.round((txt / sum) * 100),
      json: Math.round((json / sum) * 100),
      m3u8: Math.round((m3u8 / sum) * 100),
      markdown: Math.round((markdown / sum) * 100),
      hasRealData: true,
    };
  }, [stats?.exportFormatsBreakdown]);

  // Daily activity trend normalization (last 14 to 30 days)
  const trendBars = useMemo(() => {
    const recent = stats?.recentDays || [];
    if (recent.length > 0) {
      const counts = recent.map((d) => d.parses + d.exports);
      const maxVal = Math.max(...counts, 1);
      const minVal = Math.min(...counts);
      // Soft dynamic baseline: when data is concentrated in a high band (e.g. 300~750),
      // scaling strictly from 0 makes all 30 bars look almost flat and identical (60%~100%).
      // We set a soft baseline (minVal * 0.7) so peaks and troughs have vivid contrast,
      // while keeping the peak day at 100% and preserving a visible base for the lowest day.
      const baseline = counts.length > 1 && maxVal > minVal ? Math.floor(minVal * 0.7) : 0;
      const range = maxVal - baseline || 1;
      return recent.slice(0, 30).reverse().map((d) => {
        const count = d.parses + d.exports;
        const normalized = Math.round(((count - baseline) / range) * 100);
        return {
          date: d.date.slice(5),
          height: Math.max(16, Math.min(100, normalized)),
          count,
        };
      });
    }
    return [];
  }, [stats?.recentDays]);

  // Platform shares calculation
  const platformShares = useMemo(() => {
    const raw = stats?.byPlatform || {};
    const entries = Object.values(PLATFORMS).map(config => ({
      id: config.id, name: getPlatformName(config.id, language),
      count: raw[config.id]?.totalSuccess || 0, color: config.badgeBorder,
    }));
    const total = entries.reduce((sum, item) => sum + item.count, 0);
    return entries.map(item => ({...item, pct: total ? Math.round(item.count / total * 100) : 0}));
  }, [stats?.byPlatform, language]);

  const handleDashboardNavigate = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    window.open('/dashboard/', '_blank', 'noopener,noreferrer');
  }, []);

  const handleDashboardAuxClick = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      window.open('/dashboard/', '_blank', 'noopener,noreferrer');
    }
  }, []);

  const renderAllTimeSubtext = useCallback(
    (text: string) => {
      const heartChar = '♡';
      const lastIndex = text.lastIndexOf(heartChar);
      if (lastIndex === -1) {
        return text;
      }
      const prefix = text.slice(0, lastIndex);
      return (
        <>
          {prefix}
          <span
            role="button"
            tabIndex={-1}
            className="secret-dashboard-heart"
            onClick={handleDashboardNavigate}
            onAuxClick={handleDashboardAuxClick}
            title={language === 'zh-CN' ? '后台数据面板 (在新标签页打开)' : 'Admin Dashboard (Open in new tab)'}
          >
            {heartChar}
          </span>
        </>
      );
    },
    [handleDashboardNavigate, handleDashboardAuxClick, language],
  );

  return (
    <section
      id="stats"
      className="stats-journal-section"
      style={{
        maxWidth: 'var(--result-paper-width, 1050px)',
        margin: '0 auto',
        position: 'relative',
        paddingBottom: 0,
      }}
    >
      {/* Header */}
      <div
        className="stats-journal-header"
        style={{ textAlign: 'center', marginBottom: '1rem' }}
      >
        <div
          className="font-note stats-journal-subtitle"
          style={{
            fontSize: '1.65rem',
            color: '#8a7569',
            height: 'var(--ruled-line-height, 38px)',
            lineHeight: 'var(--ruled-line-height, 38px)',
          }}
        >
          {t.stats.subtitle}
        </div>
        <div
          className="font-marker stats-journal-title"
          style={{
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            color: 'var(--ink, #5a4a42)',
            height: 'calc(var(--ruled-line-height, 38px) * 2)',
            lineHeight: 'calc(var(--ruled-line-height, 38px) * 2)',
            margin: 0,
            marginTop: '1.15rem',
          }}
        >
          {t.stats.title}
        </div>
      </div>

      {/* Small journal decoration kept inside the stats content column. */}
      <div
        className="stats-chill-vibes-row"
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          minHeight: '1.9rem',
          paddingLeft: 'clamp(0.5rem, 2vw, 1.25rem)',
          marginTop: '-0.55rem',
          marginBottom: '1.5rem',
          pointerEvents: 'none',
        }}
      >
        <Sticker
          as="div"
          color="yellow"
          rotateDeg={-12}
          style={{
            opacity: 0.8,
            fontSize: '0.85rem',
            padding: '0.2rem 0.5rem',
            whiteSpace: 'nowrap',
          }}
        >
          chill vibes
        </Sticker>
      </div>

      {/* 3 Main Stationery Notes */}
      <div
        className="stats-main-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2.5rem',
          alignItems: 'stretch',
          marginBottom: '2.5rem',
        }}
      >
        {/* Card 1: Today's Note (Warm Butter Yellow Paper) */}
        <Paper
          color="yellow"
          borderVariant="default"
          rotateDeg={-1.5}
          shadow="paper"
          style={{
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div className="font-marker" style={{ fontSize: '1.35rem', color: 'var(--ink, #5a4a42)' }}>
                {t.stats.todayTitle}
              </div>
              <button
                type="button"
                onClick={refreshStats}
                aria-label="Refresh stats"
                title={language === 'zh-CN' ? '点击刷新实时手账统计' : 'Click to refresh live statistics'}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.15rem',
                  padding: '0.2rem 0.4rem',
                  color: '#8a7569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  borderRadius: '4px',
                  transition: 'transform 0.2s ease, color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--ink, #5a4a42)';
                  e.currentTarget.style.transform = 'rotate(30deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#8a7569';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>↻</span>
                <span style={{ fontSize: '1.25rem', userSelect: 'none' }}>☀️ ♫</span>
              </button>
            </div>
            <div className="font-note" style={{ fontSize: '1.45rem', color: '#8a7569', marginBottom: '1.25rem' }}>
              {todayDateFormatted}
            </div>

            {/* Today's Visitors Hero Number */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                className="font-marker"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 3.25rem)', lineHeight: 1, color: 'var(--ink, #5a4a42)' }}
              >
                <AnimatedCounter value={visitorsToday} />
              </div>
              <div className="font-handwriting" style={{ fontSize: '1.3rem', color: '#7a665b', marginTop: '0.2rem' }}>
                {t.stats.todayVisitors}
              </div>
            </div>

            {/* Sub Metrics: Parsed, Tracks, Exports */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                borderTop: '1px dashed rgba(90, 74, 66, 0.15)',
                paddingTop: '1rem',
              }}
            >
              <div>
                <div className="font-marker" style={{ fontSize: '1.75rem', color: 'var(--ink, #5a4a42)', lineHeight: 1.1 }}>
                  <AnimatedCounter value={parsedToday} />
                </div>
                <div className="font-handwriting" style={{ fontSize: '1.15rem', color: '#8a7569' }}>
                  {t.stats.todayParsed}
                </div>
              </div>
              <div>
                <div className="font-marker" style={{ fontSize: '1.75rem', color: 'var(--ink, #5a4a42)', lineHeight: 1.1 }}>
                  <AnimatedCounter value={tracksToday} />
                </div>
                <div className="font-handwriting" style={{ fontSize: '1.15rem', color: '#8a7569' }}>
                  {t.stats.todayTracks}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="font-marker" style={{ fontSize: '1.75rem', color: 'var(--ink, #5a4a42)', lineHeight: 1.1 }}>
                  <AnimatedCounter value={exportsToday} />
                </div>
                <div className="font-handwriting" style={{ fontSize: '1.15rem', color: '#8a7569' }}>
                  {t.stats.todayExports}
                </div>
              </div>
            </div>
          </div>

          <div
            className="font-note"
            style={{
              fontSize: '1.3rem',
              color: '#c44b63',
              marginTop: '1.5rem',
              borderTop: '1px dashed rgba(90, 74, 66, 0.15)',
              paddingTop: '0.75rem',
            }}
          >
            {t.stats.todayWarmNote}
          </div>
        </Paper>

        {/* Card 2: All Time (Cream White Grid Paper) */}
        <Paper
          color="white"
          borderVariant="default"
          rotateDeg={1}
          shadow="paper"
          className="tiny-grid"
          style={{
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div className="font-marker" style={{ fontSize: '1.35rem', color: 'var(--ink, #5a4a42)' }}>
                {t.stats.allTimeTitle}
              </div>
              <span style={{ fontSize: '1.25rem', userSelect: 'none', color: '#e0607a' }}>♡ ⋆</span>
            </div>
            <div className="font-note" style={{ fontSize: '1.45rem', color: '#8a7569', marginBottom: '1.25rem' }}>
              {runningDays !== null
                ? formatString(t.stats.runningDaysStamp, { days: runningDays })
                : t.stats.runningDaysUnavailable}
            </div>

            {/* Total Visitors Hero Number */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                className="font-marker"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 3.25rem)', lineHeight: 1, color: 'var(--ink, #5a4a42)' }}
              >
                <AnimatedCounter value={cumulativeDailyVisitors} />
              </div>
              <div
                className="font-handwriting"
                style={{ fontSize: '1.25rem', color: '#7a665b', marginTop: '0.2rem', cursor: 'help' }}
                title={t.stats.allTimeVisitorsTip}
              >
                {t.stats.allTimeVisitors} ⓘ
              </div>
            </div>

            {/* Sub Metrics: Parsed, Tracks, Exports */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                borderTop: '1px dashed rgba(90, 74, 66, 0.15)',
                paddingTop: '1rem',
              }}
            >
              <div>
                <div className="font-marker" style={{ fontSize: '1.75rem', color: 'var(--ink, #5a4a42)', lineHeight: 1.1 }}>
                  <AnimatedCounter value={parsedTotal} />
                </div>
                <div className="font-handwriting" style={{ fontSize: '1.15rem', color: '#8a7569' }}>
                  {t.stats.allTimePlaylists}
                </div>
              </div>
              <div>
                <div className="font-marker" style={{ fontSize: '1.75rem', color: 'var(--ink, #5a4a42)', lineHeight: 1.1 }}>
                  <AnimatedCounter value={tracksTotal} />
                </div>
                <div className="font-handwriting" style={{ fontSize: '1.15rem', color: '#8a7569' }}>
                  {t.stats.allTimeTracks}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="font-marker" style={{ fontSize: '1.75rem', color: 'var(--ink, #5a4a42)', lineHeight: 1.1 }}>
                  <AnimatedCounter value={totalExports} />
                </div>
                <div className="font-handwriting" style={{ fontSize: '1.15rem', color: '#8a7569' }}>
                  {t.stats.allTimeExports}
                </div>
              </div>
            </div>
          </div>

          <div
            className="font-note"
            style={{
              fontSize: '1.35rem',
              color: '#8a7569',
              marginTop: '1.5rem',
              borderTop: '1px dashed rgba(90, 74, 66, 0.15)',
              paddingTop: '0.75rem',
            }}
          >
            {renderAllTimeSubtext(t.stats.allTimeSubtext)}
          </div>
        </Paper>

        {/* Card 3: Platforms & Preferences (Soft Mint Paper) */}
        <Paper
          color="mint"
          borderVariant="default"
          rotateDeg={-1}
          shadow="paper"
          style={{
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div className="font-marker" style={{ fontSize: '1.35rem', color: 'var(--ink, #5a4a42)' }}>
                {t.stats.fromWhereTitle}
              </div>
              <span style={{ fontSize: '1.25rem', userSelect: 'none' }}>♫ 🍃</span>
            </div>

            {/* Platform Progress */}
            <div
              className="font-handwriting"
              style={{
                fontSize: '1.2rem',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {platformShares.map((p) => (
                <div key={p.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--ink, #5a4a42)' }}>{p.name}</span>
                    <span style={{ fontWeight: 700 }}>{p.pct}%</span>
                  </div>
                  <div
                    style={{
                      height: '0.55rem',
                      backgroundColor: 'rgba(90, 74, 66, 0.12)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="platform-progress-fill"
                      style={{
                        height: '100%',
                        backgroundColor: p.color,
                        width: `${p.pct}%`,
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Format Preferences */}
            <div style={{ borderTop: '1px dashed rgba(90, 74, 66, 0.15)', paddingTop: '1.1rem' }}>
              <div className="font-marker" style={{ fontSize: '1.15rem', color: 'var(--ink, #5a4a42)', marginBottom: '0.65rem' }}>
                {t.stats.formatPreferencesTitle}
              </div>

              {/* Multi-segment Progress Bar */}
              <div
                style={{
                  display: 'flex',
                  height: '0.65rem',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(90, 74, 66, 0.1)',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ width: `${formatStats.xlsx}%`, backgroundColor: '#4fae8a' }} title={`Excel: ${formatStats.xlsx}%`} />
                <div style={{ width: `${formatStats.json}%`, backgroundColor: '#a98ae6' }} title={`JSON: ${formatStats.json}%`} />
                <div style={{ width: `${formatStats.txt}%`, backgroundColor: '#6a82d4' }} title={`TXT: ${formatStats.txt}%`} />
                <div style={{ width: `${formatStats.csv}%`, backgroundColor: '#ee9a6c' }} title={`CSV: ${formatStats.csv}%`} />
                <div style={{ width: `${formatStats.markdown}%`, backgroundColor: '#64748b' }} title={`Markdown: ${formatStats.markdown}%`} />
                <div style={{ width: `${formatStats.m3u8}%`, backgroundColor: '#9a7fd8' }} title={`M3U8: ${formatStats.m3u8}%`} />
              </div>

              {/* Format Legend Pills */}
              <div
                className="font-note"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  fontSize: '1.05rem',
                  color: '#7a665b',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4fae8a' }} />
                  Excel ({formatStats.xlsx}%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#a98ae6' }} />
                  JSON ({formatStats.json}%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#6a82d4' }} />
                  TXT ({formatStats.txt}%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ee9a6c' }} />
                  CSV ({formatStats.csv}%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9a7fd8' }} />
                  M3U8 ({formatStats.m3u8}%)
                </span>
                <span>Markdown ({formatStats.markdown}%)</span>
              </div>
            </div>
          </div>
        </Paper>
      </div>

      {/* Card 4: Recent 30-Day Activity Footprint Paper (近30天手账足迹) */}
      <Paper
        color="white"
        borderVariant="subtle"
        shadow="paper-sm"
        rotateDeg={0.4}
        tiltFactor={0.25}
        className="stats-recent-paper"
        style={{
          padding: '1.75rem 2rem',
          margin: '0 auto',
        }}
      >
        <div
          className="stats-recent-header"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}
        >
          <div className="font-marker" style={{ fontSize: '1.25rem', color: 'var(--ink, #5a4a42)' }}>
            {t.stats.recentDaysTitle}
          </div>
          <div className="font-note" style={{ fontSize: '1.2rem', color: '#8a7569' }}>
            {t.stats.recentDaysFootnote}
          </div>
        </div>

        {/* Mini Hand-drawn Style Bar Chart */}
        <div
          className="stats-trend-chart"
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.5rem',
            height: '80px',
            padding: '0.5rem 0.25rem 0',
            borderBottom: '1px dashed rgba(90, 74, 66, 0.2)',
            position: 'relative',
          }}
        >
          {trendBars.length > 0 ? (
            trendBars.map((bar, idx) => {
              const barColors = ['#f39bb5', '#f6b88f', '#f2d26b', '#7fcfaa', '#89b4f4', '#b99ef0'];
              const barColor = barColors[idx % barColors.length];
              return (
                <div
                  key={idx}
                  className="stats-trend-bar"
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                  title={`${bar.date}: ${bar.count}`}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '56px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '18px',
                        height: `${bar.height}%`,
                        backgroundColor: barColor,
                        border: '1px solid rgba(110, 90, 80, 0.35)',
                        borderBottom: 'none',
                        borderRadius: '5px 5px 0 0',
                        transition: 'height 0.4s ease',
                      }}
                    />
                  </div>
                  <span
                    className="font-note stats-trend-date"
                    style={{
                      fontSize: '0.85rem',
                      color: '#a8968b',
                      marginTop: '0.35rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {bar.date}
                  </span>
                </div>
              );
            })
          ) : (
            <>
              {[38, 52, 44, 68, 58, 76, 62, 84, 70, 56, 78, 66, 88, 74].map((h, idx) => {
                const barColors = ['#ffd8e6', '#ffe9dc', '#fff0b3', '#cdeee0', '#d4defc', '#e8ddff'];
                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      opacity: 0.65,
                    }}
                    aria-hidden="true"
                  >
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '20px',
                        height: `${Math.round(h * 0.62)}px`,
                        backgroundColor: barColors[idx % barColors.length],
                        border: '1px dashed rgba(110, 90, 80, 0.28)',
                        borderBottom: 'none',
                        borderRadius: '5px 5px 0 0',
                      }}
                    />
                  </div>
                );
              })}
            </>
          )}
        </div>
        {trendBars.length > 0 && (
          <div className="mobile-only stats-trend-mobile-axis font-note" aria-hidden="true">
            <span>{trendBars[0].date}</span>
            <span>{trendBars[trendBars.length - 1].date}</span>
          </div>
        )}
      </Paper>
    </section>
  );
};


