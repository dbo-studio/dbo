import type { SelectInputOption } from '@/components/base/SelectInput/types';
import type { NoSQLCollectionOptions } from '@/api/nosql/types';

export type ServerToolProps = { connectionId: number };
export type ServerToolTab = 'status' | 'operations' | 'databases' | 'users' | 'gridfs' | 'changes';

export const SERVER_TOOL_MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
export const pickServerOption = (v: unknown): string => (v as SelectInputOption).value as string;

export const formatServerUptime = (secs: number): string => {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${secs % 60}s`;
};

export const SERVER_COLLECTION_KINDS: NoSQLCollectionOptions['kind'][] = ['collection', 'capped', 'timeseries', 'view'];
