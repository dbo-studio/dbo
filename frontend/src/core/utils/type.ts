import type { SimpleObject } from '@/types';

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
  if (typeof value === 'string') return !Number.isNaN(Number(value));
  return false;
}
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export const isServerSide = typeof window === 'undefined';
