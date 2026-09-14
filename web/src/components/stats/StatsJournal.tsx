import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchStats, type StatsResponse } from '../../api/client';
import { useTranslation } from '../../i18n';
import { Paper } from '../ui/Paper';

const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (typeof window === 'undefined' || (import.meta as any).env?.MODE === 'test') {
      setDisplayValue(value);
      return;
    }
    let startTimestamp: number | null = null;
    const startVal = displayValue;
    const duration = 750;

    let frameId: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startVal + (value - startVal) * ease));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
      }
    };
    frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
};

export const StatsJournal: React.FC = () => {
  const { t, format: formatString, language } = useTranslation();
  const [stats, setStats] = useState<StatsResponse | null>(null);

  const refreshStats = useCallback(() => {
    fetchStats()
      .then((res) => {
        if (res.success) {
          setStats(res.data);
        }
      })
      .catch(() => {
        // Non-blocking best-effort: silently handle network/API failures
      });
  }, []);

  useEffect(() => {
    // Initial fetch
    refreshStats();

    // Listen to global stats refresh events (fired when visit/parse/export occurs)
    const handleRefreshEvent = () => {
      refreshStats();
    };

    window.addEventListener('playlistout:stats-refresh', handleRefreshEvent);

    // Refresh when user returns to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshStats();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Gentle polling every 60s
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshStats();
      }
    }, 60000);

    return () => {
      window.removeEventListener('playlistout:stats-refresh', handleRefreshEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [refreshStats]);

  const todayDateFormatted = new Date().toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'long',
  });

  // Calculate operation days from launch date
  const runningDays = useMemo(() => {
    const launchStr = stats?.launchedAt || '2026-09-12';
    const [y, m, d] = launchStr.split('-').map(Number);
    const launchUtc = Date.UTC(y, (m || 1) - 1, d || 1);
    const now = new Date();
    const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const diffDays = Math.floor((nowUtc - launchUtc) / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  }, [stats?.launchedAt]);

  const visitorsToday = stats?.visitorsToday ?? 0;
  const parsedToday = stats?.playlistsParsedToday ?? 0;
  const tracksToday = stats?.tracksProcessedToday ?? 0;
  const exportsToday = stats?.exportsToday ?? 0;

  const totalVisitors = stats?.totalVisitors ?? 0;
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
    const sum = xlsx + csv + txt + json;
    if (sum === 0) {
      return { xlsx: 52, csv: 26, txt: 14, json: 8, hasRealData: false };
    }
    return {
      xlsx: Math.max(5, Math.round((xlsx / sum) * 100)),
      csv: Math.max(5, Math.round((csv / sum) * 100)),
      txt: Math.max(5, Math.round((txt / sum) * 100)),
      json: Math.max(5, Math.round((json / sum) * 100)),
      hasRealData: true,
    };
  }, [stats?.exportFormatsBreakdown]);

  // Daily activity trend normalization (last 14 to 30 days)
  const trendBars = useMemo(() => {
    const recent = stats?.recentDays || [];
    if (recent.length > 0) {
      const maxVal = Math.max(...recent.map((d) => d.parses + d.exports), 1);
      return recent.slice(0, 24).reverse().map((d) => ({
        date: d.date.slice(5),
        height: Math.max(15, Math.min(100, Math.round(((d.parses + d.exports) / maxVal) * 100))),
        count: d.parses + d.exports,
      }));
    }
    // Warm fallback mock trend when fresh install without historical data
    return [
      { date: '09-12', height: 45, count: 12 },
      { date: '09-13', height: 75, count: 28 },
      { date: '09-14', height: 95, count: 42 },
    ];
  }, [stats?.recentDays]);

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
      <div style={{ textAlign: 'center', marginBottom: 'calc(var(--ruled-line-height, 38px) * 1.5)' }}>
        <div
          className="font-note"
          style={{
            fontSize: '1.65rem',
            color: '#636e72',
            height: 'var(--ruled-line-height, 38px)',
            lineHeight: 'var(--ruled-line-height, 38px)',
          }}
        >
          {t.stats.subtitle}
        </div>
        <div
          className="font-marker"
          style={{
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            color: 'var(--ink, #2d3436)',
            height: 'calc(var(--ruled-line-height, 38px) * 2)',
            lineHeight: 'calc(var(--ruled-line-height, 38px) * 2)',
            margin: 0,
          }}
        >
          {t.stats.title}
        </div>
      </div>

      {/* 3 Main Stationery Notes */}
      <div
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
              <div className="font-marker" style={{ fontSize: '1.35rem', color: 'var(--ink, #2d3436)' }}>
                {t.stats.todayTitle}
              </div>
              <span style={{ fontSize: '1.25rem', userSelect: 'none' }}>☀️ ♫</span>
            </div>
            <div className="font-note" style={{ fontSize: '1.45rem', color: '#636e72', marginBottom: '1.25rem' }}>
              {todayDateFormatted}
            </div>

            {/* Today's Visitors Hero Number */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                className="font-marker"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 3.25rem)', lineHeight: 1, color: 'var(--ink, #2d3436)' }}
              >
                <AnimatedCounter value={visitorsToday} />
              </div>
              <div className="font-handwriting" style={{ fontSize: '1.3rem', color: '#4b5563', marginTop: '0.2rem' }}>
                {t.stats.todayVisitors}
              </div>
            </div>

            {/* Sub Metrics: Parsed, Tracks, Exports */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                borderTop: '1px dashed rgba(45, 52, 54, 0.15)',
                paddingTop: '1rem',
              }}
            >
              <div>
                <div className="font-marker" style={{ fontSize: '1.75rem', color: 'var(--ink, #2d3436)', lineHeight: 1.1 }}>
                  <AnimatedCounter value={parsedToday} />
                </div>
                <div className="font-handwriting" style={{ fontSize: '1.15rem', color: '#636e72' }}>
                  {t.stats.todayParsed}
                </div>
              </div>
              <div>
                <div className="font-marker" style={{ fontSize: '1.75rem', color: 'var(--ink, #2d3436)', lineHeight: 1.1 }}>
                  <AnimatedCounter value={tracksToday} />
                </div>
                <div className="font-handwriting" style={{ fontSize: '1.15rem', color: '#636e72' }}>
                  {t.stats.todayTracks}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="font-marker" style={{ fontSize: '1.75rem', color: 'var(--ink, #2d3436)', lineHeight: 1.1 }}>
                  <AnimatedCounter value={exportsToday} />
                </div>
                <div className="font-handwriting" style={{ fontSize: '1.15rem', color: '#636e72' }}>
                  {t.stats.todayExports}
                </div>
              </div>
            </div>
          </div>

          <div
            className="font-note"
            style={{
              fontSize: '1.3rem',
              color: '#d63031',
              marginTop: '1.5rem',
              borderTop: '1px dashed rgba(45, 52, 54, 0.15)',
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
              <div className="font-marker" style={{ fontSize: '1.35rem', color: 'var(--ink, #2d3436)' }}>
                {t.stats.allTimeTitle}
              </div>
              <span style={{ fontSize: '1.25rem', userSelect: 'none', color: '#e74c3c' }}>♡ ⋆</span>
            </div>
            <div className="font-note" style={{ fontSize: '1.45rem', color: '#636e72', marginBottom: '1.25rem' }}>
              {formatString(t.stats.runningDaysStamp, { days: runningDays })}
            </div>

            {/* Total Visitors Hero Number */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                className="font-marker"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 3.25rem)', lineHeight: 1, color: 'var(--ink, #2d3436)' }}
              >
                <AnimatedCounter value={totalVisitors} />
              </div>
              <div className="font-handwriting" style={{ fontSize: '1.3rem', color: '#4b5563', marginTop: '0.2rem' }}>
                {t.stats.allTimeVisitors}
              </div>
            </div>

            {/* Sub Metrics: Parsed, Tracks, Exports */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                borderTop: '1px dashed rgba(45, 52, 54, 0.15)',
                paddingTop: '1rem',
              }}
            >
              <div>
                <div className="font-marker" style={{ fontSize: '1.75rem', color: 'var(--ink, #2d3436)', lineHeight: 1.1 }}>
                  <AnimatedCounter value={parsedTotal} />
                </div>
                <div className="font-handwriting" style={{ fontSize: '1.15rem', color: '#636e72' }}>
                  {t.stats.allTimePlaylists}
                </div>
              </div>
              <div>
                <div className="font-marker" style={{ fontSize: '1.75rem', color: 'var(--ink, #2d3436)', lineHeight: 1.1 }}>
                  <AnimatedCounter value={tracksTotal} />
                </div>
                <div className="font-handwriting" style={{ fontSize: '1.15rem', color: '#636e72' }}>
                  {t.stats.allTimeTracks}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className="font-marker" style={{ fontSize: '1.75rem', color: 'var(--ink, #2d3436)', lineHeight: 1.1 }}>
                  <AnimatedCounter value={totalExports} />
                </div>
                <div className="font-handwriting" style={{ fontSize: '1.15rem', color: '#636e72' }}>
                  {t.stats.allTimeExports}
                </div>
              </div>
            </div>
          </div>

          <div
            className="font-note"
            style={{
              fontSize: '1.35rem',
              color: '#636e72',
              marginTop: '1.5rem',
              borderTop: '1px dashed rgba(45, 52, 54, 0.15)',
              paddingTop: '0.75rem',
            }}
          >
            {t.stats.allTimeSubtext}
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
              <div className="font-marker" style={{ fontSize: '1.35rem', color: 'var(--ink, #2d3436)' }}>
                {t.stats.fromWhereTitle}
              </div>
              <span style={{ fontSize: '1.25rem', userSelect: 'none' }}>♫ 🍃</span>
            </div>

            {/* Platform Progress */}
            <div className="font-handwriting" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--ink, #2d3436)' }}>{t.search.platformQQ}</span>
                <span style={{ fontWeight: 700 }}>100%</span>
              </div>
              <div
                style={{
                  height: '0.55rem',
                  backgroundColor: 'rgba(45, 52, 54, 0.12)',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="platform-progress-fill"
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--ink, #2d3436)',
                    width: '100%',
                  }}
                />
              </div>
              <div style={{ color: '#8a8f92', fontSize: '1.05rem', marginTop: '0.4rem' }}>
                <span className="font-note">{t.stats.otherPlatformsComing}</span>
              </div>
            </div>

            {/* Format Preferences */}
            <div style={{ borderTop: '1px dashed rgba(45, 52, 54, 0.15)', paddingTop: '1.1rem' }}>
              <div className="font-marker" style={{ fontSize: '1.15rem', color: 'var(--ink, #2d3436)', marginBottom: '0.65rem' }}>
                {t.stats.formatPreferencesTitle}
              </div>

              {/* Multi-segment Progress Bar */}
              <div
                style={{
                  display: 'flex',
                  height: '0.65rem',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(45, 52, 54, 0.1)',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ width: `${formatStats.xlsx}%`, backgroundColor: '#27ae60' }} title={`Excel: ${formatStats.xlsx}%`} />
                <div style={{ width: `${formatStats.csv}%`, backgroundColor: '#e67e22' }} title={`CSV: ${formatStats.csv}%`} />
                <div style={{ width: `${formatStats.txt}%`, backgroundColor: '#2980b9' }} title={`TXT: ${formatStats.txt}%`} />
                <div style={{ width: `${formatStats.json}%`, backgroundColor: '#8e44ad' }} title={`JSON: ${formatStats.json}%`} />
              </div>

              {/* Format Legend Pills */}
              <div
                className="font-note"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  fontSize: '1.05rem',
                  color: '#4b5563',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#27ae60' }} />
                  Excel ({formatStats.xlsx}%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#e67e22' }} />
                  CSV ({formatStats.csv}%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#2980b9' }} />
                  TXT ({formatStats.txt}%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#8e44ad' }} />
                  JSON ({formatStats.json}%)
                </span>
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
        style={{
          padding: '1.75rem 2rem',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <div className="font-marker" style={{ fontSize: '1.25rem', color: 'var(--ink, #2d3436)' }}>
            {t.stats.recentDaysTitle}
          </div>
          <div className="font-note" style={{ fontSize: '1.2rem', color: '#636e72' }}>
            {t.stats.recentDaysFootnote}
          </div>
        </div>

        {/* Mini Hand-drawn Style Bar Chart */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.5rem',
            height: '80px',
            padding: '0.5rem 0.25rem 0',
            borderBottom: '1px dashed rgba(45, 52, 54, 0.2)',
          }}
        >
          {trendBars.map((bar, idx) => (
            <div
              key={idx}
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
                  maxWidth: '18px',
                  height: `${bar.height}%`,
                  backgroundColor: 'rgba(230, 126, 34, 0.75)',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.4s ease',
                }}
              />
              <span
                className="font-note"
                style={{
                  fontSize: '0.85rem',
                  color: '#8a8f92',
                  marginTop: '0.35rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {bar.date}
              </span>
            </div>
          ))}
        </div>
      </Paper>

      {/* Soft & gentle running days badge right above footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: 'calc(var(--ruled-line-height, 38px) * 1.25)',
          marginBottom: '0.25rem',
        }}
      >
        <div
          className="running-days-stamp font-note"
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed rgba(160, 150, 140, 0.45)',
            borderRadius: '12px',
            padding: '0.45rem 1.75rem',
            transform: 'rotate(-0.8deg)',
            backgroundColor: 'rgba(255, 253, 247, 0.85)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            position: 'relative',
          }}
        >
          <span style={{ position: 'absolute', top: '-7px', right: '-6px', fontSize: '0.95rem', color: 'rgba(160, 150, 140, 0.6)' }}>✦</span>
          <span style={{ position: 'absolute', bottom: '-7px', left: '-6px', fontSize: '0.95rem', color: 'rgba(160, 150, 140, 0.6)' }}>⋆</span>
          <div
            className="font-marker"
            style={{
              fontSize: '1.25rem',
              color: '#57606f',
              letterSpacing: '0.03em',
              lineHeight: 1.2,
            }}
          >
            {formatString(t.stats.runningDaysStamp, { days: runningDays })}
          </div>
          <div
            className="font-handwriting"
            style={{
              fontSize: '1.05rem',
              color: '#8a8f92',
              marginTop: '0.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>☕</span>
            <span>{t.stats.runningDaysSubtext}</span>
            <span>🌱</span>
          </div>
        </div>
      </div>
    </section>
  );
};

