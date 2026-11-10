import { type TouchEvent, useRef, useState } from 'react';

const THRESHOLD = 64;
const MAX_PULL = 96;
// Finger travel is damped so the indicator trails the touch like a native overscroll.
const DAMPING = 0.5;

type PullBindings = {
  onTouchStart: (event: TouchEvent<HTMLElement>) => void;
  onTouchMove: (event: TouchEvent<HTMLElement>) => void;
  onTouchEnd: () => void;
};

/**
 * Pull-down gesture for a scroll container: spread `bind` on it and render `<PullIndicator pull progress />` above the content.
 * Only starts when the container is scrolled to the top.
 */
export const usePullToRefresh = (
  onRefresh: () => void,
  enabled = true
): { bind: PullBindings; pull: number; progress: number } => {
  const [pull, setPull] = useState(0);
  const startYRef = useRef<number | null>(null);

  const bind: PullBindings = {
    onTouchStart: (event): void => {
      startYRef.current = enabled && event.currentTarget.scrollTop === 0 ? event.touches[0].clientY : null;
    },
    onTouchMove: (event): void => {
      if (startYRef.current === null) return;
      setPull(Math.min(Math.max(event.touches[0].clientY - startYRef.current, 0) * DAMPING, MAX_PULL));
    },
    onTouchEnd: (): void => {
      const reached = pull >= THRESHOLD;
      startYRef.current = null;
      setPull(0);
      if (reached) onRefresh();
    }
  };

  return { bind, pull, progress: Math.min(pull / THRESHOLD, 1) };
};
