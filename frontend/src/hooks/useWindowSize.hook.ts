import { tools } from '@/core/utils';
import { useEffect, useState } from 'react';

export const useWindowSize = (fullSize?: boolean) => {
  const [windowSize, setWindowSize] = useState<{
    width: undefined | string;
    height: undefined | string;
    widthNumber: undefined | number;
    heightNumber: undefined | number;
  }>({
    width: undefined,
    height: undefined,
    heightNumber: undefined,
    widthNumber: undefined
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: `${window.innerWidth}px`,
        height: fullSize ? tools.screenFullHeight().toString() : tools.screenMaxHeight().toString(),
        heightNumber: fullSize ? Number(tools.screenFullHeight(true)) : Number(tools.screenMaxHeight(true)),
        widthNumber: window.innerWidth
      });
    }
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
};
