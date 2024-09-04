import { FilterType } from '@/types';
import { ColumnType } from '@/types/Data';

export type FilterItemProps = {
  filter: FilterType;
  columns: ColumnType[];
};

export type AddFilterButtonProps = {
  columns: ColumnType[];
};

export type RemoveFilterButtonProps = {
  filter: FilterType;
};
