import { tools } from '@/core/utils';
import { useEffect, useState } from 'react';

type WindowSizeType = {
  width: undefined | string;
  height: undefined | string;
  widthNumber: undefined | number;
  heightNumber: undefined | number;
};

const getWindowSize = (fullSize?: boolean): WindowSizeType => ({
  width: `${window.innerWidth}px`,
  height: fullSize ? tools.screenFullHeight().toString() : tools.screenMaxHeight().toString(),
  heightNumber: fullSize ? Number(tools.screenFullHeight(true)) : Number(tools.screenMaxHeight(true)),
  widthNumber: window.innerWidth
});

export const useWindowSize = (fullSize?: boolean): WindowSizeType => {
  const [windowSize, setWindowSize] = useState<WindowSizeType>(() => getWindowSize(fullSize));

  useEffect(() => {
    const handleResize = (): void => {
      setWindowSize(getWindowSize(fullSize));
    };
    window.addEventListener('resize', handleResize);
    return (): void => window.removeEventListener('resize', handleResize);
  }, [fullSize]);

  return windowSize;
};
