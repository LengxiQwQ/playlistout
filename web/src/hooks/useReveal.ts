import { useEffect, useRef, useState } from 'react';
import { isRevealEnabled } from '../motion/revealEnv';

type Callback = (visible: boolean) => void;
const callbacks = new WeakMap<Element, Callback>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          callbacks.get(entry.target)?.(true);
          observer?.unobserve(entry.target);
          callbacks.delete(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  );
  return observer;
}

/** Test helper only: clears cached observer instance across stubbed globals. */
export function __resetRevealObserverForTests(): void {
  observer?.disconnect();
  observer = null;
}

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(() => !isRevealEnabled());

  useEffect(() => {
    const el = ref.current;
    if (!el || revealed) return;
    // Keyboard users: reveal immediately if focus lands inside a hidden block.
    const onFocus = () => setRevealed(true);
    el.addEventListener('focusin', onFocus);
    callbacks.set(el, () => setRevealed(true));
    getObserver().observe(el);
    return () => {
      el.removeEventListener('focusin', onFocus);
      observer?.unobserve(el);
      callbacks.delete(el);
    };
  }, [revealed]);

  return { ref, revealed };
}
