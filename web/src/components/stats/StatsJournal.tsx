import React, { useEffect, useState } from 'react';
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
  const { t, language } = useTranslation();
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchStats()
      .then((res) => {
        if (isMounted && res.success) {
          setStats(res.data);
        }
      })
      .catch(() => {
        // Non-blocking best-effort: silently handle network/API failures
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const todayDateFormatted = new Date().toLocaleDateString(language === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'long',
  });

  const parsedToday = stats?.playlistsParsedToday ?? 0;
  const tracksToday = stats?.tracksProcessedToday ?? 0;
  const parsedTotal = stats?.totalPlaylistsParsed ?? 0;
  const tracksTotal = stats?.totalTracksProcessed ?? 0;

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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2.5rem',
          alignItems: 'start',
        }}
      >
        {/* Card 1: Today's Note */}
        <Paper
          color="yellow"
          borderVariant="default"
          rotateDeg={-1.5}
          shadow="paper"
          style={{ padding: '2.25rem' }}
        >
          <div className="font-marker" style={{ fontSize: '1.35rem', color: 'var(--ink, #2d3436)' }}>
            {t.stats.todayTitle}
          </div>
          <div className="font-note" style={{ fontSize: '1.45rem', color: '#636e72', marginBottom: '1.25rem' }}>
            {todayDateFormatted}
          </div>

          <div
            className="font-marker"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 3.25rem)', lineHeight: 1, color: 'var(--ink, #2d3436)' }}
          >
            <AnimatedCounter value={parsedToday} />
          </div>
          <div className="font-handwriting" style={{ fontSize: '1.35rem', color: '#4b5563', marginBottom: '1.25rem' }}>
            {t.stats.todayParsed}
          </div>

          <div
            className="font-marker"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', lineHeight: 1, color: 'var(--ink, #2d3436)' }}
          >
            <AnimatedCounter value={tracksToday} />
          </div>
          <div className="font-handwriting" style={{ fontSize: '1.35rem', color: '#4b5563' }}>
            {t.stats.todayTracks}
          </div>
        </Paper>

        {/* Card 2: All Time */}
        <Paper
          color="white"
          borderVariant="default"
          rotateDeg={1}
          shadow="paper"
          className="tiny-grid"
          style={{ padding: '2.25rem' }}
        >
          <div className="font-marker" style={{ fontSize: '1.35rem', color: 'var(--ink, #2d3436)', marginBottom: '1.25rem' }}>
            {t.stats.allTimeTitle}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div className="font-marker" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: 'var(--ink, #2d3436)' }}>
                <AnimatedCounter value={parsedTotal} />
              </div>
              <div className="font-handwriting" style={{ fontSize: '1.25rem', color: '#636e72' }}>
                {t.stats.allTimePlaylists}
              </div>
            </div>

            <div>
              <div className="font-marker" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: 'var(--ink, #2d3436)' }}>
                <AnimatedCounter value={tracksTotal} />
              </div>
              <div className="font-handwriting" style={{ fontSize: '1.25rem', color: '#636e72' }}>
                {t.stats.allTimeTracks}
              </div>
            </div>
          </div>

          <div className="font-note" style={{ fontSize: '1.45rem', color: '#636e72' }}>
            {t.stats.allTimeSubtext}
          </div>
        </Paper>

        {/* Card 3: From Where */}
        <Paper
          color="mint"
          borderVariant="default"
          rotateDeg={-1}
          shadow="paper"
          style={{ padding: '1.75rem' }}
        >
          <div className="font-marker" style={{ fontSize: '1.35rem', color: 'var(--ink, #2d3436)', marginBottom: '1.25rem' }}>
            {t.stats.fromWhereTitle}
          </div>

          <div className="font-handwriting" style={{ fontSize: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 700 }}>{t.search.platformQQ}</span>
                <span>100%</span>
              </div>
              <div
                style={{
                  height: '0.5rem',
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
            </div>

            <div style={{ color: '#8a8f92', fontSize: '1.1rem', marginTop: '0.5rem' }}>
              <span className="font-note" style={{ fontSize: '1.3rem' }}>
                {t.stats.otherPlatformsComing}
              </span>
            </div>
          </div>
        </Paper>
      </div>
    </section>
  );
};
