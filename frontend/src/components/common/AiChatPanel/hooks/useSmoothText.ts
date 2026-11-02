import { useEffect, useRef, useState } from 'react';

/**
 * Reveals streamed text at an even pace. Tokens arrive in bursts; this
 * catches up on the backlog a little every frame (about eight frames to close
 * any gap), so text appears steadily instead of in jumps. When `active` is
 * false the full text is returned at once.
 */
export const useSmoothText = (target: string, active: boolean): string => {
  const [length, setLength] = useState(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    const tick = (): void => {
      setLength((current) => {
        const goal = targetRef.current.length;
        if (current >= goal) return goal;
        return Math.min(goal, current + Math.max(1, Math.ceil((goal - current) / 8)));
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return (): void => cancelAnimationFrame(frame);
  }, [active]);

  return active ? target.slice(0, length) : target;
};
