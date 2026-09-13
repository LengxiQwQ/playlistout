import React, { useEffect, useState } from 'react';
import { fetchStats, type StatsResponse } from '../../api/client';
import { useTranslation } from '../../i18n';
import { Paper } from '../ui/Paper';

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

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

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
        margin: '5rem auto 0',
        position: 'relative',
        paddingBottom: '1.5rem',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="font-note" style={{ fontSize: '1.75rem', color: '#636e72' }}>
          {t.stats.subtitle}
        </div>
        <div
          className="font-marker"
          style={{
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            color: 'var(--ink, #2d3436)',
            marginTop: '0.25rem',
          }}
        >
          {t.stats.title}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Card 1: Today's Note */}
        <Paper
          color="yellow"
          borderVariant="default"
          rotateDeg={-1.5}
          shadow="paper"
          style={{ padding: '1.75rem' }}
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
            {formatNumber(parsedToday)}
          </div>
          <div className="font-handwriting" style={{ fontSize: '1.35rem', color: '#4b5563', marginBottom: '1.25rem' }}>
            {t.stats.todayParsed}
          </div>

          <div
            className="font-marker"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', lineHeight: 1, color: 'var(--ink, #2d3436)' }}
          >
            {formatNumber(tracksToday)}
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
          style={{ padding: '1.75rem' }}
        >
          <div className="font-marker" style={{ fontSize: '1.35rem', color: 'var(--ink, #2d3436)', marginBottom: '1.25rem' }}>
            {t.stats.allTimeTitle}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <div className="font-marker" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: 'var(--ink, #2d3436)' }}>
                {formatNumber(parsedTotal)}
              </div>
              <div className="font-handwriting" style={{ fontSize: '1.25rem', color: '#636e72' }}>
                {t.stats.allTimePlaylists}
              </div>
            </div>

            <div>
              <div className="font-marker" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: 'var(--ink, #2d3436)' }}>
                {formatNumber(tracksTotal)}
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
                <span style={{ fontWeight: 700 }}>QQ Music</span>
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
                NetEase, Kugou & Kuwo coming soon...
              </span>
            </div>
          </div>
        </Paper>
      </div>
    </section>
  );
};
