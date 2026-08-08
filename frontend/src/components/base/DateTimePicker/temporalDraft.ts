import { valueToEditorString } from '@/core/utils/dataValue';
import type { DateTimePickerMode } from './types';

export type TemporalParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

const OFFSET_SUFFIX_RE = /([Zz]|[+-]\d{2}:?\d{2})$/;

export const formatTemporalParts = (parts: TemporalParts, mode: DateTimePickerMode, offsetSuffix = ''): string => {
  const date = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  const time = `${pad2(parts.hours)}:${pad2(parts.minutes)}:${pad2(parts.seconds)}`;
  if (mode === 'date') {
    return date;
  }
  if (mode === 'time') {
    return time + offsetSuffix;
  }
  return `${date} ${time}${offsetSuffix}`;
};

export const nowTemporalParts = (): TemporalParts => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds()
  };
};

export const extractOffsetSuffix = (raw: string): string => {
  const match = raw.trim().match(OFFSET_SUFFIX_RE);
  return match?.[1] ?? '';
};

/** Parse cell / draft string into parts; falls back to now for missing segments. */
export const parseTemporalDraft = (value: unknown, mode: DateTimePickerMode): TemporalParts => {
  const fallback = nowTemporalParts();
  const raw = valueToEditorString(value).trim().replace('T', ' ');
  if (!raw) {
    return fallback;
  }

  const withoutOffset = raw.replace(OFFSET_SUFFIX_RE, '').trim();
  const dateMatch = withoutOffset.match(/(\d{4})-(\d{2})-(\d{2})/);
  const timeMatch = withoutOffset.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);

  return {
    year: dateMatch ? Number(dateMatch[1]) : fallback.year,
    month: dateMatch ? Number(dateMatch[2]) : fallback.month,
    day: dateMatch ? Number(dateMatch[3]) : fallback.day,
    hours: timeMatch ? Number(timeMatch[1]) : mode === 'date' ? 0 : fallback.hours,
    minutes: timeMatch ? Number(timeMatch[2]) : mode === 'date' ? 0 : fallback.minutes,
    seconds: timeMatch?.[3] ? Number(timeMatch[3]) : mode === 'date' ? 0 : timeMatch ? 0 : fallback.seconds
  };
};

export const formatTemporalDraft = (value: unknown, mode: DateTimePickerMode): string => {
  const raw = valueToEditorString(value).trim();
  if (!raw) {
    return '';
  }
  const offset = mode === 'date' ? '' : extractOffsetSuffix(raw.replace('T', ' '));
  return formatTemporalParts(parseTemporalDraft(raw, mode), mode, offset);
};

const isValidDateParts = (year: number, month: number, day: number): boolean => {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
};

/** Strict validation before commit. Empty string is allowed (clears / NULL path upstream). */
export const isValidTemporalDraft = (draft: string, mode: DateTimePickerMode): boolean => {
  const trimmed = draft.trim();
  if (!trimmed) {
    return true;
  }
  const withoutOffset = trimmed.replace('T', ' ').replace(OFFSET_SUFFIX_RE, '').trim();

  if (mode === 'date') {
    const m = withoutOffset.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) {
      return false;
    }
    return isValidDateParts(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  if (mode === 'time') {
    const m = withoutOffset.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) {
      return false;
    }
    const h = Number(m[1]);
    const min = Number(m[2]);
    const s = m[3] !== undefined ? Number(m[3]) : 0;
    return h >= 0 && h <= 23 && min >= 0 && min <= 59 && s >= 0 && s <= 59;
  }

  const m = withoutOffset.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) {
    return false;
  }
  const h = Number(m[4]);
  const min = Number(m[5]);
  const s = m[6] !== undefined ? Number(m[6]) : 0;
  return (
    isValidDateParts(Number(m[1]), Number(m[2]), Number(m[3])) &&
    h >= 0 &&
    h <= 23 &&
    min >= 0 &&
    min <= 59 &&
    s >= 0 &&
    s <= 59
  );
};

export const daysInMonth = (year: number, month: number): number => new Date(year, month, 0).getDate();

/** Sunday-based weekday index for the 1st of month (0=Sun). */
export const monthStartWeekday = (year: number, month: number): number => new Date(year, month - 1, 1).getDay();

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

export const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

export const range = (count: number): number[] => Array.from({ length: count }, (_, i) => i);

export const padSelect = (n: number): string => String(n).padStart(2, '0');

export const isDateTimePickerMode = (value: string | undefined): value is DateTimePickerMode => {
  return value === 'date' || value === 'time' || value === 'datetime';
};
