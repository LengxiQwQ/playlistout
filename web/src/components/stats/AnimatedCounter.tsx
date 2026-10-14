import React, { useEffect, useState } from 'react';

export interface AnimatedCounterProps {
  value: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value }) => {
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

export default AnimatedCounter;
