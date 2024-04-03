import { useEffect, useLayoutEffect, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export function useClickAway(cb) {
  const ref = useRef(null);
  const refCb = useRef(cb);

  useLayoutEffect(() => {
    refCb.current = cb;
  });

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const handler = (e) => {
      const element = ref.current;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      if (element && !element.contains(e.target)) {
        refCb.current(e);
      }
    };

    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);

    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  return ref;
}
