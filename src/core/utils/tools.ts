import { isNumber, isObject } from './type';

export const tools = {
  screenMaxHeight: (): string => (window ? window.innerHeight - 56 + 'px' : '0px'),
  screenFullHeight: (): string => (window ? window.innerHeight + 'px' : '0px'),
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
