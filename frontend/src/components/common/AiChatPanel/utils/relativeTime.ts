import locales from '@/locales';

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60]
];

const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'narrow' });

/** Backend timestamps are "YYYY-MM-DD HH:mm:ss" without a zone. */
export function relativeTime(value: string | undefined, now = Date.now()): string {
  if (!value) return '';

  const time = new Date(value.replace(' ', 'T')).getTime();
  if (Number.isNaN(time)) return '';

  const seconds = Math.round((time - now) / 1000);
  const abs = Math.abs(seconds);
  const unit = UNITS.find(([, size]) => abs >= size);
  if (!unit) return locales.time_just_now;

  return formatter.format(Math.trunc(seconds / unit[1]), unit[0]);
}
