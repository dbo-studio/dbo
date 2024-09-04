import { ColumnType } from '@/types/Data';

export type ColumnItemProps = {
  column: ColumnType;
  onClick: (column: ColumnType) => void;
};
