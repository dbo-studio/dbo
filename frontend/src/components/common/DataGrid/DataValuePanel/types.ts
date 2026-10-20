import type { ColumnType } from '@/types';

export type ValuePanelMode = 'text' | 'json' | 'hex' | 'image' | 'geometry';

export type DataValueEditorProps = {
  value: unknown;
  column?: ColumnType;
  editable: boolean;
  width?: number;
  height?: number;
  onApply?: (next: unknown) => void;
  onCancel?: () => void;
  showApply?: boolean;
};
