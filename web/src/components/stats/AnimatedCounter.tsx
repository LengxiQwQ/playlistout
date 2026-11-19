import React, { useEffect, useRef, useState } from 'react';

export interface AnimatedCounterProps {
  value: number;
  start?: boolean;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, start = true }) => {
  const isTestMode = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const effectiveStart = isTestMode || prefersReducedMotion || start;

  const [displayValue, setDisplayValue] = useState(() => (effectiveStart ? value : 0));
  const latestDisplayRef = useRef(displayValue);
  latestDisplayRef.current = displayValue;

  useEffect(() => {
    if (typeof window === 'undefined' || isTestMode || prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }
    if (!effectiveStart) {
      setDisplayValue(0);
      return;
    }
    let startTimestamp: number | null = null;
    const startVal = latestDisplayRef.current;
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
  }, [value, effectiveStart, isTestMode, prefersReducedMotion]);

  return <>{displayValue.toLocaleString()}</>;
};

export default AnimatedCounter;
