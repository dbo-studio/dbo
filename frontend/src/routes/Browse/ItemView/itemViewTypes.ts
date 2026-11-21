import type { NoSQLItem } from '@/api/nosql/types';

export type ItemViewProps = {
  item: NoSQLItem;
  editable: boolean;
  onSave: (value: unknown) => void;
  tree?: { connectionId: number; containerId: string; onMutated: () => void };
};

export type ItemViewRow = [string, string];
export type ItemTextMode = 'raw' | 'json' | 'hex' | 'base64';
