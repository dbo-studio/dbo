import locales from '@/locales';

/** "1 change" / "3 changes". */
export const changeCount = (n: number): string =>
  n === 1 ? locales.ai_change_one : locales.ai_change_many.replace('{n}', String(n));
