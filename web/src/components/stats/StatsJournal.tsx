import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { fetchStats, type StatsResponse, type StatsIncrementDetail } from '../../api/client';
import { useTranslation } from '../../i18n';
import { Paper } from '../ui/Paper';
import { Sticker } from '../ui/Sticker';
import { Tape } from '../ui/Tape';
import { PLATFORMS, getPlatformName } from '../../utils/platform';
import { calculateRunningDays } from '../../utils/uptime';
import { AnimatedCounter } from './AnimatedCounter';
import { RunningDaysStamp, type RunningDaysStampProps } from './RunningDaysStamp';
import { Reveal } from '../motion/Reveal';
import { useReveal } from '../../hooks/useReveal';
import { isRevealEnabled } from '../../motion/revealEnv';

export { RunningDaysStamp, type RunningDaysStampProps };

export interface StatsJournalProps {
  today?: Date | string;
}

const RevealStampCard: React.FC<{
  delay: number;
  rot: number;
  children: (counterStarted: boolean) => React.ReactNode;
}> = ({ delay, rot, children }) => {
  const { ref, revealed } = useReveal<HTMLDivElement>();
  const [counterStarted, setCounterStarted] = useState(() => !isRevealEnabled());

  useEffect(() => {
    if (!revealed) return;
    if (!isRevealEnabled()) {
      setCounterStarted(true);
      return;
    }
    const timer = window.setTimeout(() => {
      setCounterStarted(true);
    }, delay + 400);
    return () => window.clearTimeout(timer);
  }, [revealed, delay]);

  return (
    <div
      ref={ref}
      className="reveal"
      data-reveal="stamp"
      data-revealed={revealed ? 'true' : 'false'}
      style={{ '--reveal-delay': `${delay}ms`, '--rot': `${rot}deg`, display: 'flex' } as React.CSSProperties}
    >
      {children(counterStarted)}
    </div>
  );
};

export const StatsJournal: React.FC<StatsJournalProps> = ({ today }) => {
  const { t, format: formatString, language } = useTranslation();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsSettled, setStatsSettled] = useState(false);
  const [activeTrendIdx, setActiveTrendIdx] = useState<number | null>(null);

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
        setStatsSettled(true);
      })
      .catch(() => {
        // Non-blocking best-effort: silently handle network/API failures
        setStatsSettled(true);
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
      const baseline = counts.length > 1 && maxVal > minVal ? Math.floor(minVal * 0.7) : 0;
      const range = maxVal - baseline || 1;
      return recent.slice(0, 30).reverse().map((d) => {
        const count = d.parses + d.exports;
        const normalized = Math.round(((count - baseline) / range) * 100);
        return {
          fullDate: d.date,
          date: d.date.slice(5),
          height: Math.max(16, Math.min(100, normalized)),
          count,
          parses: d.parses,
          exports: d.exports,
        };
      });
    }
    return [];
  }, [stats?.recentDays]);

  // Platform shares calculation
  const platformShares = useMemo(() => {
    const raw = stats?.byPlatform || {};
    const entries = Object.values(PLATFORMS).map((config) => ({
      id: config.id,
      name: getPlatformName(config.id, language),
      count: raw[config.id]?.totalSuccess || 0,
      color: config.badgeBorder,
    }));
    const total = entries.reduce((sum, item) => sum + item.count, 0);
    return entries.map((item) => ({ ...item, pct: total ? Math.round((item.count / total) * 100) : 0 }));
  }, [stats?.byPlatform, language]);

  const hasPlatformData = useMemo(
    () => platformShares.some((item) => item.count > 0),
    [platformShares],
  );
  const showPlatformEmptyNote = statsSettled && !hasPlatformData;

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

  const lastActiveBarRef = useRef<{
    fullDate: string;
    date: string;
    height: number;
    count: number;
    parses: number;
    exports: number;
  } | null>(null);

  if (trendBars.length > 0 && !lastActiveBarRef.current) {
    lastActiveBarRef.current = trendBars[trendBars.length - 1];
  }

  if (activeTrendIdx !== null && trendBars[activeTrendIdx]) {
    lastActiveBarRef.current = trendBars[activeTrendIdx];
  }

  const currentTooltipBar = activeTrendIdx !== null && trendBars[activeTrendIdx]
    ? trendBars[activeTrendIdx]
    : lastActiveBarRef.current;

  const tooltipLeftPercent = useMemo(() => {
    if (trendBars.length === 0) return 50;
    if (activeTrendIdx !== null) {
      return ((activeTrendIdx + 0.5) / trendBars.length) * 100;
    }
    if (lastActiveBarRef.current) {
      const idx = trendBars.findIndex(
        (b) => (b.fullDate || b.date) === (lastActiveBarRef.current?.fullDate || lastActiveBarRef.current?.date)
      );
      if (idx !== -1) {
        return ((idx + 0.5) / trendBars.length) * 100;
      }
    }
    return 50;
  }, [activeTrendIdx, trendBars]);

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
      <Reveal effect="fade-up" delay={0} className="stats-journal-header" style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <div
          className="font-note stats-journal-subtitle"
          style={{
            fontSize: '1.65rem',
            color: 'var(--ink-light, #8a7569)',
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
          <span className="scribble-line stats-scribble-line">{t.stats.title}</span>
        </div>
      </Reveal>

      {/* Act 4 Deco 1: chill vibes sticker */}
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
        <Reveal effect="pop" delay={1500} rot={-12}>
          <Sticker
            as="div"
            color="yellow"
            rotateDeg={0}
            style={{
              opacity: 0.85,
              fontSize: '0.85rem',
              padding: '0.2rem 0.5rem',
              whiteSpace: 'nowrap',
            }}
          >
            chill vibes
          </Sticker>
        </Reveal>
      </div>

      {/* Act 4 Deco 2..8: Festive stickers migrated into StatsJournal */}
      {/* Deco 2: Taro Headphones Sticker (left gutter) */}
      <Reveal
        effect="pop"
        delay={1620}
        rot={-8}
        className="stats-deco-headphones"
        aria-hidden="true"
      >
        <div className="stationery-sticker delay-3" style={{ ['--sticker-rot' as any]: '-8deg', opacity: 0.92 }}>
          <svg width="62" height="58" viewBox="0 0 68 64" fill="none">
            <path d="M14 36V30C14 18.9543 22.9543 10 34 10C45.0457 10 54 18.9543 54 30V36" stroke="#fffdf9" strokeWidth="9" strokeLinecap="round" />
            <path d="M14 36V30C14 18.9543 22.9543 10 34 10C45.0457 10 54 18.9543 54 30V36" stroke="#6e5a50" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M19 25C22 18 27.5 14 34 14C40.5 14 46 18 49 25" stroke="#e8ddff" strokeWidth="4" strokeLinecap="round" />
            <rect x="7" y="31" width="13" height="22" rx="6.5" fill="#e8ddff" stroke="#6e5a50" strokeWidth="2.2" />
            <rect x="48" y="31" width="13" height="22" rx="6.5" fill="#ffd8e6" stroke="#6e5a50" strokeWidth="2.2" />
            <circle cx="13.5" cy="42" r="2.5" fill="#fffdf9" />
            <circle cx="54.5" cy="42" r="2.5" fill="#fffdf9" />
          </svg>
        </div>
      </Reveal>

      {/* Deco 3: Star #1 (right edge) */}
      <Reveal
        effect="pop"
        delay={1740}
        rot={10}
        className="stats-deco-star1"
        aria-hidden="true"
      >
        <div
          className="note-sparkle"
          style={{ fontSize: '2.1rem', color: 'var(--accent-lemon, #e3b23c)', opacity: 0.88 }}
        >
          ★
        </div>
      </Reveal>

      {/* Deco 4: Star #2 (top-left header) - hidden on mobile */}
      <Reveal
        effect="pop"
        delay={1860}
        rot={-14}
        data-deco-mobile="hide"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '0.65rem',
          left: '3.5rem',
          pointerEvents: 'none',
          zIndex: 15,
        }}
      >
        <div
          className="note-sparkle"
          style={{ fontSize: '1.75rem', color: 'var(--accent-strawberry, #e8789a)', opacity: 0.85 }}
        >
          ✦
        </div>
      </Reveal>

      {/* Deco 5: Music Note #1 (bottom-left) */}
      <Reveal
        effect="pop"
        delay={1980}
        rot={-10}
        className="stats-deco-note1"
        aria-hidden="true"
      >
        <div
          className="stationery-sticker delay-1"
          style={{ ['--sticker-rot' as any]: '-10deg', fontSize: '2.2rem', color: 'var(--accent-peach, #ee9a6c)', opacity: 0.82 }}
        >
          ♪
        </div>
      </Reveal>

      {/* Deco 6: Music Note #2 (top-right header) - hidden on mobile */}
      <Reveal
        effect="pop"
        delay={2100}
        rot={12}
        data-deco-mobile="hide"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '0.9rem',
          right: '3.2rem',
          pointerEvents: 'none',
          zIndex: 15,
        }}
      >
        <div
          className="stationery-sticker delay-2"
          style={{ ['--sticker-rot' as any]: '12deg', fontSize: '2rem', color: 'var(--accent-taro, #9a7fd8)', opacity: 0.82 }}
        >
          ♬
        </div>
      </Reveal>

      {/* Deco 7: Green Washi Tape Corner Strip - hidden on mobile */}
      <Reveal
        effect="pop"
        delay={2220}
        rot={-38}
        data-deco-mobile="hide"
        className="stats-deco-tape"
        aria-hidden="true"
      >
        <Tape color="green" rotateDeg={0} style={{ width: '3.4rem', height: '1.05rem', opacity: 0.8 }} />
      </Reveal>

      {/* Deco 8: 80¢ NOTE Postage Stamp SVG Sticker - hidden on mobile */}
      <Reveal
        effect="pop"
        delay={2340}
        rot={7}
        data-deco-mobile="hide"
        className="stats-deco-stamp"
        aria-hidden="true"
      >
        <div className="stationery-sticker" style={{ ['--sticker-rot' as any]: '7deg', opacity: 0.92 }}>
          <svg width="64" height="74" viewBox="0 0 64 74" fill="none">
            <rect x="5" y="5" width="54" height="64" rx="4" fill="#fffdf9" stroke="#e8a0b4" strokeWidth="2.2" strokeDasharray="4 3" />
            <rect x="11" y="11" width="42" height="44" rx="3" fill="#fff4c7" stroke="#6e5a50" strokeWidth="1.6" />
            <path d="M27 41V23L41 20V38" stroke="#6e5a50" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="24" cy="41" r="4" fill="#ec7f9f" stroke="#6e5a50" strokeWidth="1.6" />
            <circle cx="38" cy="38" r="4" fill="#7fcfaa" stroke="#6e5a50" strokeWidth="1.6" />
            <text x="32" y="64" textAnchor="middle" fill="#8a7569" fontSize="8.5" fontWeight="700" fontFamily="Space Mono, monospace">80¢ NOTE</text>
          </svg>
        </div>
      </Reveal>

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
        {/* Card 1: Today's Note (Warm Butter Yellow Paper, rot -0.6deg) */}
        <RevealStampCard delay={300} rot={-0.6}>
          {(counterStarted) => (
            <Paper
              color="yellow"
              borderVariant="default"
              rotateDeg={0}
              shadow="paper"
              style={{
                flex: 1,
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
                      color: 'var(--ink-light, #8a7569)',
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
                      e.currentTarget.style.color = 'var(--ink-light, #8a7569)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>↻</span>
                    <span style={{ fontSize: '1.25rem', userSelect: 'none' }}>☀️ ♫</span>
                  </button>
                </div>
                <div className="font-note" style={{ fontSize: '1.45rem', color: 'var(--ink-light, #8a7569)', marginBottom: '1.25rem' }}>
                  {todayDateFormatted}
                </div>

                {/* Today's Visitors Hero Number */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div
                    className="font-marker font-num"
                    style={{ fontSize: 'clamp(2.5rem, 5vw, 3.25rem)', lineHeight: 1, color: 'var(--ink, #5a4a42)' }}
                  >
                    <AnimatedCounter value={visitorsToday} start={counterStarted} />
                  </div>
                  <div className="font-handwriting" style={{ fontSize: '1.3rem', color: 'var(--ink-light, #8a7569)', marginTop: '0.2rem' }}>
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
                    <div className="font-marker font-num" style={{ fontSize: '1.75rem', color: 'var(--ink, #5a4a42)', lineHeight: 1.1 }}>
                      <AnimatedCounter value={parsedToday} start={counterStarted} />
                    </div>
                    <div className="font-handwriting" style={{ fontSize: '1.15rem', color: 'var(--ink-light, #8a7569)' }}>
                      {t.stats.todayParsed}
                    </div>
                  </div>
                  <div>
                    <div className="font-marker font-num" style={{ fontSize: '1.75rem', color: 'var(--ink, #5a4a42)', lineHeight: 1.1 }}>
                      <AnimatedCounter value={tracksToday} start={counterStarted} />
                    </div>
                    <div className="font-handwriting" style={{ fontSize: '1.15rem', color: 'var(--ink-light, #8a7569)' }}>
                      {t.stats.todayTracks}
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="font-marker font-num" style={{ fontSize: '1.75rem', color: 'var(--ink, #5a4a42)', lineHeight: 1.1 }}>
                      <AnimatedCounter value={exportsToday} start={counterStarted} />
                    </div>
                    <div className="font-handwriting" style={{ fontSize: '1.15rem', color: 'var(--ink-light, #8a7569)' }}>
                      {t.stats.todayExports}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="font-note"
                style={{
                  fontSize: '1.3rem',
                  color: 'var(--accent-strawberry-ink, #c25478)',
                  marginTop: '1.5rem',
                  borderTop: '1px dashed rgba(90, 74, 66, 0.15)',
                  paddingTop: '0.75rem',
                }}
              >
                {t.stats.todayWarmNote}
              </div>
            </Paper>
          )}
        </RevealStampCard>

        {/* Card 2: All Time (Cream White Grid Paper, rot 0.4deg) */}
        <RevealStampCard delay={480} rot={0.4}>
          {(counterStarted) => (
            <Paper
              color="white"
              borderVariant="default"
              rotateDeg={0}
              shadow="paper"
              className="tiny-grid"
              style={{
                flex: 1,
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
                  <span style={{ fontSize: '1.25rem', userSelect: 'none', color: 'var(--accent-strawberry, #e8789a)' }}>♡ ⋆</span>
                </div>
                <div className="font-note font-num" style={{ fontSize: '1.45rem', fontWeight: 400, color: 'var(--ink-light, #8a7569)', marginBottom: '1.25rem' }}>
                  {runningDays !== null
                    ? formatString(t.stats.runningDaysStamp, { days: runningDays })
                    : t.stats.runningDaysUnavailable}
                </div>

                {/* Total Visitors Hero Number */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div
                    className="font-marker font-num"
                    style={{ fontSize: 'clamp(2.5rem, 5vw, 3.25rem)', lineHeight: 1, color: 'var(--ink, #5a4a42)' }}
                  >
                    <AnimatedCounter value={cumulativeDailyVisitors} start={counterStarted} />
                  </div>
                  <div
                    className="font-handwriting"
                    style={{ fontSize: '1.25rem', color: 'var(--ink-light, #8a7569)', marginTop: '0.2rem', cursor: 'help' }}
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
                    <div className="font-marker font-num" style={{ fontSize: '1.75rem', color: 'var(--ink, #5a4a42)', lineHeight: 1.1 }}>
                      <AnimatedCounter value={parsedTotal} start={counterStarted} />
                    </div>
                    <div className="font-handwriting" style={{ fontSize: '1.15rem', color: 'var(--ink-light, #8a7569)' }}>
                      {t.stats.allTimePlaylists}
                    </div>
                  </div>
                  <div>
                    <div className="font-marker font-num" style={{ fontSize: '1.75rem', color: 'var(--ink, #5a4a42)', lineHeight: 1.1 }}>
                      <AnimatedCounter value={tracksTotal} start={counterStarted} />
                    </div>
                    <div className="font-handwriting" style={{ fontSize: '1.15rem', color: 'var(--ink-light, #8a7569)' }}>
                      {t.stats.allTimeTracks}
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="font-marker font-num" style={{ fontSize: '1.75rem', color: 'var(--ink, #5a4a42)', lineHeight: 1.1 }}>
                      <AnimatedCounter value={totalExports} start={counterStarted} />
                    </div>
                    <div className="font-handwriting" style={{ fontSize: '1.15rem', color: 'var(--ink-light, #8a7569)' }}>
                      {t.stats.allTimeExports}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="font-note"
                style={{
                  fontSize: '1.35rem',
                  color: 'var(--ink-light, #8a7569)',
                  marginTop: '1.5rem',
                  borderTop: '1px dashed rgba(90, 74, 66, 0.15)',
                  paddingTop: '0.75rem',
                }}
              >
                {renderAllTimeSubtext(t.stats.allTimeSubtext)}
              </div>
            </Paper>
          )}
        </RevealStampCard>

        {/* Card 3: Platforms & Preferences (Soft Mint Paper, rot -0.3deg) */}
        <RevealStampCard delay={660} rot={-0.3}>
          {() => (
            <Paper
              color="mint"
              borderVariant="default"
              rotateDeg={0}
              shadow="paper"
              style={{
                flex: 1,
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

                {/* Platform Progress or Empty-State Taro Sticky Note */}
                {!showPlatformEmptyNote ? (
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
                    {platformShares.map((p, idx) => (
                      <div key={p.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--ink, #5a4a42)' }}>{p.name}</span>
                          <span className="font-num" style={{ fontWeight: 700 }}>{p.pct}%</span>
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
                              ['--i' as any]: idx,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="font-handwriting"
                    style={{
                      backgroundColor: 'var(--mac-taro, #e3d9ff)',
                      border: '1.5px dashed var(--accent-taro, #9a7fd8)',
                      borderRadius: '10px',
                      padding: '1.25rem 1rem',
                      textAlign: 'center',
                      color: 'var(--accent-taro, #9a7fd8)',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      transform: 'rotate(-1deg)',
                      boxShadow: '2px 3px 0 var(--shadow-ink)',
                      marginBottom: '1.5rem',
                    }}
                  >
                    {t.stats.waitingFirstVisitor}
                  </div>
                )}

                {/* Format Preferences */}
                <div style={{ borderTop: '1px dashed rgba(90, 74, 66, 0.15)', paddingTop: '1.1rem' }}>
                  <div className="font-marker" style={{ fontSize: '1.15rem', color: 'var(--ink, #5a4a42)', marginBottom: '0.65rem' }}>
                    {t.stats.formatPreferencesTitle}
                  </div>

                  {/* Multi-segment Progress Bar */}
                  <div
                    className="format-progress-bar"
                    style={{
                      display: 'flex',
                      height: '0.65rem',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      backgroundColor: 'rgba(90, 74, 66, 0.1)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ width: `${formatStats.xlsx}%`, backgroundColor: 'var(--accent-mint, #4fae8a)' }} title={`Excel: ${formatStats.xlsx}%`} />
                    <div style={{ width: `${formatStats.json}%`, backgroundColor: 'var(--accent-taro, #9a7fd8)' }} title={`JSON: ${formatStats.json}%`} />
                    <div style={{ width: `${formatStats.txt}%`, backgroundColor: 'var(--accent-sky, #6a82d4)' }} title={`TXT: ${formatStats.txt}%`} />
                    <div style={{ width: `${formatStats.csv}%`, backgroundColor: 'var(--accent-peach, #ee9a6c)' }} title={`CSV: ${formatStats.csv}%`} />
                    <div style={{ width: `${formatStats.markdown}%`, backgroundColor: 'var(--ink-light, #8a7569)' }} title={`Markdown: ${formatStats.markdown}%`} />
                    <div style={{ width: `${formatStats.m3u8}%`, backgroundColor: 'var(--accent-strawberry, #e8789a)' }} title={`M3U8: ${formatStats.m3u8}%`} />
                  </div>

                  {/* Format Legend Pills */}
                  <div
                    className="font-note"
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      fontSize: '1.05rem',
                      color: 'var(--ink-light, #8a7569)',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent-mint, #4fae8a)' }} />
                      Excel ({formatStats.xlsx}%)
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent-taro, #9a7fd8)' }} />
                      JSON ({formatStats.json}%)
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent-sky, #6a82d4)' }} />
                      TXT ({formatStats.txt}%)
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent-peach, #ee9a6c)' }} />
                      CSV ({formatStats.csv}%)
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent-strawberry, #e8789a)' }} />
                      M3U8 ({formatStats.m3u8}%)
                    </span>
                    <span>Markdown ({formatStats.markdown}%)</span>
                  </div>
                </div>
              </div>
            </Paper>
          )}
        </RevealStampCard>
      </div>

      {/* Card 4: Recent 30-Day Activity Footprint Paper (近30天手账足迹) */}
      <Reveal effect="fade-up" delay={300} rot={0.3}>
        <Paper
          color="white"
          borderVariant="subtle"
          shadow="paper-sm"
          rotateDeg={0}
          tiltFactor={0.25}
          className="stats-recent-paper"
          style={{
            padding: '1.75rem 2rem',
            margin: '0 auto',
          }}
        >
          <div
            className="stats-recent-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.85rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div className="font-marker" style={{ fontSize: '1.25rem', color: 'var(--ink, #5a4a42)' }}>
              {t.stats.recentDaysTitle}
            </div>
            <div
              className="font-note"
              style={{
                fontSize: '1.15rem',
                color: activeTrendIdx !== null && trendBars[activeTrendIdx] ? '#c25478' : 'var(--ink-light, #8a7569)',
                transition: 'color 180ms ease',
              }}
            >
              {activeTrendIdx !== null && trendBars[activeTrendIdx]
                ? `✦ ${trendBars[activeTrendIdx].fullDate || trendBars[activeTrendIdx].date} · 共 ${trendBars[activeTrendIdx].count} 份流转 ♫`
                : t.stats.recentDaysFootnote}
            </div>
          </div>

          {/* Mini Hand-drawn Style Bar Chart (7 macaron colors cycling) */}
          <Reveal
            stagger
            effect="grow-bar"
            delay={200}
            className="stats-trend-bars stats-trend-chart"
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              height: '84px',
              borderBottom: '1.5px dashed rgba(180, 144, 130, 0.45)',
              position: 'relative',
            }}
            onPointerLeave={() => setActiveTrendIdx(null)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setActiveTrendIdx(null);
              }
            }}
          >
            {trendBars.length > 0 ? (
              <>
                {trendBars.map((bar, idx) => {
                  const barColors = [
                    'var(--accent-strawberry, #e8789a)',
                    'var(--accent-peach, #ee9a6c)',
                    'var(--accent-lemon, #e3b23c)',
                    'var(--accent-mint, #4fae8a)',
                    'var(--accent-sky, #6a82d4)',
                    'var(--accent-taro, #9a7fd8)',
                    'var(--mac-matcha, #e2f2c9)',
                  ];
                  const barColor = barColors[idx % barColors.length];
                  return (
                    <div
                      key={idx}
                      data-reveal-item=""
                      className={`stats-trend-bar ${activeTrendIdx === idx ? 'is-active' : ''}`.trim()}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                        justifyContent: 'flex-end',
                        position: 'relative',
                        cursor: 'pointer',
                        ['--i' as any]: idx,
                      }}
                      tabIndex={0}
                      role="graphics-symbol"
                      aria-label={`${bar.fullDate || bar.date}: ${bar.count}`}
                      onMouseEnter={() => setActiveTrendIdx(idx)}
                      onFocus={() => setActiveTrendIdx(idx)}
                    >
                      <div
                        className="stats-trend-bar-track"
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '58px',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                        }}
                      >
                        <div
                          className="stats-trend-bar-fill"
                          style={{
                            width: '100%',
                            maxWidth: '14px',
                            height: `${bar.height}%`,
                            backgroundColor: barColor,
                            border: '1px solid rgba(110, 90, 80, 0.35)',
                            borderBottom: 'none',
                            borderRadius: '5px 5px 0 0',
                            transition: 'height 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Pop-on Hand-Journal Tooltip — Single continuous gliding tooltip */}
                {currentTooltipBar && (
                  <div
                    className={`stats-trend-tooltip ${activeTrendIdx !== null ? 'is-active' : ''}`.trim()}
                    role="tooltip"
                    style={{
                      left: `${tooltipLeftPercent}%`,
                    }}
                  >
                    <div className="stats-trend-tooltip-date font-mono">
                      {currentTooltipBar.fullDate || currentTooltipBar.date}
                    </div>
                    <div className="stats-trend-tooltip-total font-sans">
                      <span className="stats-trend-tooltip-num">{currentTooltipBar.count}</span>
                      <span className="stats-trend-tooltip-unit">份流转</span>
                    </div>
                    {(currentTooltipBar.parses > 0 || currentTooltipBar.exports > 0) && (
                      <div className="stats-trend-tooltip-detail font-sans">
                        <span>解析 {currentTooltipBar.parses}</span>
                        <span className="stats-trend-tooltip-dot">·</span>
                        <span>导出 {currentTooltipBar.exports}</span>
                      </div>
                    )}
                    <div className="stats-trend-tooltip-arrow" aria-hidden="true" />
                  </div>
                )}
              </>
            ) : (
              <>
                {[38, 52, 44, 68, 58, 76, 62, 84, 70, 56, 78, 66, 88, 74].map((h, idx) => {
                  const barColors = [
                    'var(--mac-strawberry, #ffd6e0)',
                    'var(--mac-peach, #ffdcc7)',
                    'var(--mac-lemon, #fff1b8)',
                    'var(--mac-mint, #cdefe3)',
                    'var(--mac-sky, #d4ecff)',
                    'var(--mac-taro, #e3d9ff)',
                    'var(--mac-matcha, #e2f2c9)',
                  ];
                  return (
                    <div
                      key={idx}
                      data-reveal-item=""
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%',
                        justifyContent: 'flex-end',
                        opacity: 0.72,
                        ['--i' as any]: idx,
                      }}
                      aria-hidden="true"
                    >
                      <div
                        className="stats-trend-bar-fill"
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
          </Reveal>
          {trendBars.length > 0 && (
            <div className="stats-trend-axis font-note" aria-hidden="true">
              <span className="stats-trend-axis-start font-mono">
                {trendBars[0].fullDate || trendBars[0].date}
              </span>
              <span className="stats-trend-axis-badge font-note">
                ✦ 连续 30 天手账足迹 ✦
              </span>
              <span className="stats-trend-axis-end font-mono">
                {trendBars[trendBars.length - 1].fullDate || trendBars[trendBars.length - 1].date}
              </span>
            </div>
          )}
        </Paper>
      </Reveal>
    </section>
  );
};
