import { tools } from '@/core/utils';
import { useEffect, useState } from 'react';

type WindowSizeType = {
  width: undefined | string;
  height: undefined | string;
  widthNumber: undefined | number;
  heightNumber: undefined | number;
};

export const useWindowSize = (fullSize?: boolean): WindowSizeType => {
  const [windowSize, setWindowSize] = useState<WindowSizeType>({
    width: undefined,
    height: undefined,
    heightNumber: undefined,
    widthNumber: undefined
  });

  useEffect(() => {
    const handleResize = (): void => {
      setWindowSize({
        width: `${window.innerWidth}px`,
        height: fullSize ? tools.screenFullHeight().toString() : tools.screenMaxHeight().toString(),
        heightNumber: fullSize ? Number(tools.screenFullHeight(true)) : Number(tools.screenMaxHeight(true)),
        widthNumber: window.innerWidth
      });
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return (): void => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
};
