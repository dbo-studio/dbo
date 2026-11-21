import type { NoSQLItem } from '@/api/nosql/types';
import type { ItemTextMode } from './itemViewTypes';

/** Above this the JSON editor is opt-in: Monaco holds the whole text and a big document freezes it. */
export const ITEM_VIEW_RAW_LIMIT = 256 * 1024;

export const formatItemSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

export const isBase64Item = (item: NoSQLItem): boolean => item.meta?.encoding === 'base64';

export const bytesOfBase64 = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export const asItemText = (value: unknown): string => (typeof value === 'string' ? value : JSON.stringify(value, null, 2));

export const cellText = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v));

export const renderItemText = (value: string, binary: boolean, mode: ItemTextMode): string => {
  const bytes = binary ? bytesOfBase64(value) : new TextEncoder().encode(value);
  switch (mode) {
    case 'hex':
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ');
    case 'base64':
      return binary ? value : btoa(String.fromCharCode(...bytes));
    case 'json':
      try {
        return JSON.stringify(JSON.parse(binary ? new TextDecoder().decode(bytes) : value), null, 2);
      } catch {
        return value;
      }
    default:
      return value;
  }
};

export const tryPrettyJson = (s: string): string => {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
};
