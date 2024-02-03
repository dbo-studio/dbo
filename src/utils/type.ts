import { SimpleObject } from '@/types';

export function isObject<T>(val: unknown): val is SimpleObject<T> {
  return (
    val !== null &&
    typeof val === 'object' &&
    Array.isArray(val) === false &&
    Object.prototype.toString.call(val) === '[object Object]'
  );
}

export function isNumber(value: unknown): value is number {
  if (typeof value === 'number') return true;
  else if (typeof value === 'string') return !isNaN(Number(value));
  return false;
}
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}
