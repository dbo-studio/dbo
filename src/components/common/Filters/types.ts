import { FilterType } from '@/src/types';
import { ColumnType } from '../DBDataGrid/types';

export type FilterItemProps = {
  filter: FilterType;
  columns: ColumnType[];
  filterLength: number;
};

export type AddFilterButtonProps = {
  filterLength: number;
};

export type RemoveFilterButtonProps = {
  filter: FilterType;
};
