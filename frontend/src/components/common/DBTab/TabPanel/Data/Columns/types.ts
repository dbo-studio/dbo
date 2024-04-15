import { ColumnType } from '@/src/types/Data';

export type ColumnItemProps = {
  column: ColumnType;
  onClick: (column: ColumnType) => void;
};
