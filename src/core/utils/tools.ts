import { isNumber, isObject } from '.';

export const tools = {
  screenMaxHeight: (asNumber?: boolean): string | number => {
    // if (!isServerSide) {
    const height = window?.innerHeight - 56;
    return asNumber ? height : height + 'px';
    // }
    // return '100%';
  },
  screenFullHeight: (): string => {
    // if (!isServerSide) {
    return window?.innerHeight + 'px';
    // }
    // return '100%';
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
  }
};
export const isEmpty = (data: unknown): data is never | undefined | null => {
  return (
    (!data && !isNumber(data)) ||
    (Array.isArray(data) && data.length === 0) ||
    (isObject(data) && Object.keys(data).length === 0)
  );
};
//please don't add itt to toooolssss , auto import does not work with this
