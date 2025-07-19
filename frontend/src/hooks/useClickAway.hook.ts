import type { EventFor } from '@/types';
import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react';

export function useClickAway(cb: any): RefObject<any> {
  const ref = useRef(null);
  const refCb = useRef(cb);

  useLayoutEffect(() => {
    refCb.current = cb;
  });

  useEffect(() => {
    const handler = (e: EventFor<'div', 'onMouseDown'>): void => {
      const element = ref.current;
      // @ts-ignore
      if (element && !element.contains(e.target)) {
        refCb.current(e);
      }
    };
    // @ts-ignore
    document.addEventListener('mousedown', handler);
    // @ts-ignore
    document.addEventListener('touchstart', handler);

    return (): void => {
      // @ts-ignore
      document.removeEventListener('mousedown', handler);
      // @ts-ignore
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  return ref;
}
