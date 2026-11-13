import type { NoSQLDocNode } from '@/api/nosql/types';

/** Scalar types the tree can write. Others (decimal, binary, timestamp, regex) are shown but read-only. */
export const EDIT_TYPES = ['string', 'int32', 'int64', 'double', 'bool', 'null', 'date', 'objectId'] as const;
export type EditType = (typeof EDIT_TYPES)[number];

export const isEditType = (t: string): t is EditType => (EDIT_TYPES as readonly string[]).includes(t);

const INT = /^-?\d+$/;
const INT32_MAX = 2 ** 31;

/** The text shown in the edit box: strings without quotes, dates and ids unwrapped. */
export function editText(n: NoSQLDocNode): string {
  try {
    const v: unknown = JSON.parse(n.value);
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.$oid === 'string') return o.$oid;
      if (typeof o.$date === 'string') return o.$date;
    }
  } catch {
    /* fall through to the raw text */
  }
  return n.value;
}

/** Turns typed text into the Extended JSON the server reads, or null when the text does not fit the type. */
export function toWire(text: string, type: EditType | 'auto'): string | null {
  const t = text.trim();
  switch (type) {
    case 'string':
      return JSON.stringify(text);
    case 'int32':
      return INT.test(t) && Math.abs(Number(t)) < INT32_MAX ? `{"$numberInt":"${Number(t)}"}` : null;
    case 'int64':
      return INT.test(t) ? `{"$numberLong":"${t}"}` : null;
    case 'double':
      return t !== '' && Number.isFinite(Number(t)) ? `{"$numberDouble":"${Number(t)}"}` : null;
    case 'bool':
      return t === 'true' || t === 'false' ? t : null;
    case 'null':
      return 'null';
    case 'date':
      return Number.isNaN(Date.parse(t)) ? null : `{"$date":"${new Date(t).toISOString()}"}`;
    case 'objectId':
      return /^[0-9a-fA-F]{24}$/.test(t) ? `{"$oid":"${t}"}` : null;
    default:
      // Auto: valid JSON is sent as typed, anything else is a string.
      try {
        JSON.parse(t);
        return t;
      } catch {
        return JSON.stringify(text);
      }
  }
}

/** A field name the server accepts for $set: no operators, no dots. */
export const validFieldName = (k: string): boolean => k !== '' && !k.startsWith('$') && !k.includes('.');
