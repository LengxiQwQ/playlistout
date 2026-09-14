import { useEffect } from 'react';

/**
 * useBaselineGrid
 *
 * Dynamically ensures that sections with the `.baseline-grid-snap` class
 * have their margins adjusted so that each subsequent section starts
 * at an exact integer multiple of `--ruled-line-height` (38px).
 * This maintains pixel-perfect baseline grid alignment across the whole page,
 * even with dynamic content heights (expanded playlists, error states, etc.).
 */
export function useBaselineGrid(dependencies: unknown[] = []) {
  useEffect(() => {
    const H = 38;

    const snap = () => {
      const sections = document.querySelectorAll<HTMLElement>('.baseline-grid-snap');
      if (!sections.length) return;

      // 1. Reset dynamic margins to measure true natural heights
      sections.forEach((sec) => {
        sec.style.marginBottom = '0px';
      });

      // 2. Adjust margin-bottom so next sibling lands on an exact multiple of 38px
      sections.forEach((sec, idx) => {
        const rect = sec.getBoundingClientRect();
        const currentBottom = sec.offsetTop + rect.height;
        const rem = currentBottom % H;
        const pad = rem === 0 ? 0 : H - rem;
        // Keep 2 grid rows (76px) base margin between sections for relaxed spacing, 0 after last
        const baseMargin = idx === sections.length - 1 ? 0 : H * 2;
        sec.style.marginBottom = `${pad + baseMargin}px`;
      });
    };

    // Run snap on next animation frame
    const frameId = requestAnimationFrame(snap);

    // Re-snap once custom web fonts finish loading
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        requestAnimationFrame(snap);
      });
    }

    window.addEventListener('resize', snap);
    const container = document.querySelector('.journal-container');
    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        requestAnimationFrame(snap);
      });
      observer.observe(container);
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', snap);
      if (observer) observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
