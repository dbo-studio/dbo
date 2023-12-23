import { FilterType } from '@/src/types';
import { ColumnOrColumnGroup } from 'react-data-grid';

export type FilterItemProps = {
  filter: FilterType;
  columns: ColumnOrColumnGroup<any, any>[];
  filterLength: number;
};

export type AddFilterButtonProps = {
  filterLength: number;
};

export type RemoveFilterButtonProps = {
  filter: FilterType;
};
