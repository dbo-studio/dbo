import type { FilterType } from '@/types';
import type { ColumnType } from '@/types/Data';

export type FilterItemProps = {
  filter: FilterType;
  columns: ColumnType[];
  apply: () => void;
};

export type AddFilterButtonProps = {
  columns: ColumnType[];
};

export type RemoveFilterButtonProps = {
  filter: FilterType;
  apply: () => void;
};
