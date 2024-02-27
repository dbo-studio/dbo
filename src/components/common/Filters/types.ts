import { FilterType } from '@/src/types';
import { ColumnType } from '@/src/types/Data';

export type FilterItemProps = {
  filter: FilterType;
  columns: ColumnType[];
};

export type RemoveFilterButtonProps = {
  filter: FilterType;
};
