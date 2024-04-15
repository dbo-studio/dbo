import { useEffect, useRef } from 'react';
export const useMount = (): boolean => {
  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return function cleanup(): void {
      isMounted.current = false;
    };
  }, []);
  return isMounted.current;
};
