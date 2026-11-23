import { type RefObject, useLayoutEffect, useRef } from 'react';

/** Keeps ref.current updated without assigning during render (react-hooks/refs). */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
