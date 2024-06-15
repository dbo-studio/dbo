import { isNumber, isObject } from '.';

export const tools = {
  screenMaxHeight: (asNumber?: boolean): string | number => {
    const height = window?.innerHeight - 56;
    return asNumber ? height : height + 'px';
  },
  screenFullHeight: (): string => {
    return window?.innerHeight + 'px';
  },
  isEmpty: (data: unknown): data is never | undefined | null => {
    return (
      (!data && !isNumber(data)) ||
      (Array.isArray(data) && data.length === 0) ||
      (isObject(data) && Object.keys(data).length === 0)
    );
  },
  cleanObject: (obj: any) => {
    if (!isObject(obj)) return {};
    const newObj = { ...obj };
    Object.keys(newObj).forEach((key) => (newObj[key] === undefined ? delete newObj[key] : {}));
    return newObj;
  },

  isMac: () => {
    if (typeof window === 'undefined') {
      return false;
    }

    const { userAgent } = navigator;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return /Mac/i.test(userAgent) || (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream);
  },
  isElectron: () => {
    return window.electron;
  }
};
