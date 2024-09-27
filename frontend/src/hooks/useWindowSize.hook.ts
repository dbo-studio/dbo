import { useEffect, useState } from 'react';
import { tools } from '../core/utils';

export const useWindowSize = (fullSize?: boolean) => {
  const [windowSize, setWindowSize] = useState<{
    width: undefined | string;
    height: undefined | string;
  }>({
    width: undefined,
    height: undefined
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: `${window.innerWidth}px`,
        height: fullSize ? tools.screenFullHeight().toString() : tools.screenMaxHeight().toString()
      });
    }
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
};
