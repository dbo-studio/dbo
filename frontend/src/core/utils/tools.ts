import { getTauriVersion } from '@tauri-apps/api/app';
import { type SqlLanguage, format } from 'sql-formatter';
import { isNumber, isObject } from '.';

export const tools = {
  screenMaxHeight: (asNumber?: boolean): string | number => {
    const height = window?.innerHeight - 40;
    return asNumber ? height : `${height}px`;
  },
  screenFullHeight: (): string => {
    return `${window?.innerHeight}px`;
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
    for (const key of Object.keys(newObj)) {
      newObj[key] === undefined ? delete newObj[key] : {};
    }
    return newObj;
  },

  isMac: () => {
    const { userAgent } = navigator;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return /Mac/i.test(userAgent) || (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream);
  },
  isTauri: async () => {
    try {
      return (await getTauriVersion()) !== null;
    } catch (e) {
      return false;
    }
  },
  minifySql(value: string): string {
    if (!value.length) {
      return '';
    }
    return (
      value
        // Remove multiline comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove single-line comments
        .replace(/--.*$/gm, '')
        // Remove leading and trailing whitespace from each line
        .replace(/^\s+|\s+$/gm, '')
        // Remove extra spaces between keywords and values
        .replace(/\s+/g, ' ')
        // Trim any remaining whitespace at the start and end of the string
        .trim()
    );
  },
  formatSql: (query: string, lang: SqlLanguage): string => {
    return format(query, { language: lang, keywordCase: 'preserve' });
  },
  isValidJSON: (value: string) => {
    try {
      JSON.parse(value);
      return true;
    } catch (e) {
      return false;
    }
  }
};
