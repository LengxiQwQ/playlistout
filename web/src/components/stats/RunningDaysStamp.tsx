import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from '../../i18n';
import { calculateRunningDays } from '../../utils/uptime';
import { Reveal } from '../motion/Reveal';

export interface RunningDaysStampProps {
  today?: Date | string;
}

export const RunningDaysStamp: React.FC<RunningDaysStampProps> = ({ today }) => {
  const { t, format: formatString } = useTranslation();
  const [launchedAt, setLaunchedAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleLaunchedAt = (event: Event) => {
      const detail = (event as CustomEvent<{ launchedAt?: string }>).detail;
      if (detail) {
        setLaunchedAt(detail.launchedAt);
      }
    };
    window.addEventListener('playlistout:stats-launched-at', handleLaunchedAt);
    return () => {
      window.removeEventListener('playlistout:stats-launched-at', handleLaunchedAt);
    };
  }, []);

  const runningDays = useMemo(() => {
    return calculateRunningDays(launchedAt, today);
  }, [launchedAt, today]);

  return (
    <div
      className="running-days-stamp-wrap"
      style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: 'calc(var(--ruled-line-height, 38px) * 1.65)',
        marginBottom: '0.25rem',
      }}
    >
      <Reveal effect="stamp" delay={200} rot={-3}>
        <div
          className="running-days-stamp font-note"
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed var(--accent-strawberry, #e8789a)',
            borderRadius: '14px',
            padding: '0.85rem 2rem 0.75rem',
            background: 'linear-gradient(135deg, var(--paper-white, #fffdf8) 0%, var(--mac-strawberry, #ffd6e0) 100%)',
            boxShadow: '3px 4px 0 var(--shadow-ink)',
            position: 'relative',
          }}
        >
          <span style={{ position: 'absolute', top: '-9px', right: '-8px', fontSize: '1.05rem', color: 'var(--btn-primary-bg, #ec7f9f)' }}>✦</span>
          <span style={{ position: 'absolute', bottom: '-9px', left: '-8px', fontSize: '1.05rem', color: 'var(--accent-lemon, #e3b23c)' }}>⋆</span>
          <div
            className="font-marker font-num"
            style={{
              fontSize: '1.25rem',
              color: 'var(--ink, #5a4a42)',
              letterSpacing: '0.03em',
              lineHeight: 1.2,
            }}
          >
            {runningDays !== null
              ? formatString(t.stats.runningDaysStamp, { days: runningDays })
              : t.stats.runningDaysUnavailable}
          </div>
          <div
            className="font-handwriting"
            style={{
              fontSize: 'clamp(0.9rem, 3.5vw, 1.05rem)',
              color: 'var(--ink-muted, #a8968b)',
              marginTop: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap',
            }}
          >
            <span>☕</span>
            <span>{t.stats.runningDaysSubtext}</span>
            <span>🌱</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
};

export default RunningDaysStamp;
