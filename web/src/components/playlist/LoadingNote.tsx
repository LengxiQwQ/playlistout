import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';

export const LoadingNote: React.FC = () => {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [t.loading.step1, t.loading.step2, t.loading.step3];

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 1400);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div
      className="loading-note-container"
      data-testid="loading-indicator"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.75rem 1rem',
        gap: '0.75rem',
      }}
    >
      <div
        className="animate-ink-spin"
        style={{
          width: '2.5rem',
          height: '2.5rem',
          border: '3px solid rgba(45, 52, 54, 0.2)',
          borderTopColor: 'var(--ink, #2d3436)',
          borderRightColor: 'var(--ink, #2d3436)',
          borderRadius: '50%',
        }}
        aria-hidden="true"
      />
      <div
        className="font-handwriting"
        style={{
          fontSize: '1.4rem',
          fontWeight: 700,
          color: 'var(--ink, #2d3436)',
          transition: 'opacity 0.2s ease',
        }}
      >
        {steps[stepIndex]}
      </div>
    </div>
  );
};
