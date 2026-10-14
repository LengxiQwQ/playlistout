import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from '../../i18n';
import { calculateRunningDays } from '../../utils/uptime';

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
      <div
        className="running-days-stamp font-note"
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed rgba(160, 150, 140, 0.45)',
          borderRadius: '12px',
          padding: '0.75rem 1.85rem 0.65rem',
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
          {runningDays !== null
            ? formatString(t.stats.runningDaysStamp, { days: runningDays })
            : t.stats.runningDaysUnavailable}
        </div>
        <div
          className="font-handwriting"
          style={{
            fontSize: '1.05rem',
            color: '#8a8f92',
            marginTop: '0.35rem',
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
  );
};

export default RunningDaysStamp;
