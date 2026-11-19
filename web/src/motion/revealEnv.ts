let enabled: boolean | null = null;

export function isRevealEnabled(): boolean {
  if (enabled !== null) return enabled;
  if (typeof window === 'undefined' || typeof document === 'undefined') return (enabled = false);
  if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') return (enabled = false);
  if (typeof window.IntersectionObserver !== 'function') return (enabled = false);
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return (enabled = false);
  return (enabled = true);
}

/** Call once in main.tsx before React renders. */
export function initRevealEnv(): void {
  if (isRevealEnabled()) document.documentElement.classList.add('has-reveal');
}

/** Test helper only. */
export function __resetRevealEnvForTests(): void {
  enabled = null;
}
