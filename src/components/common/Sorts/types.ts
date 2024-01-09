import { SortType } from '@/src/types';
import { ColumnType } from '../DBDataGrid/types';

export type SortItemProps = {
  sort: SortType;
  columns: ColumnType[];
  sortLength: number;
};

export type AddSortButtonProps = {
  sortLength: number;
};

export type RemoveSortButtonProps = {
  sort: SortType;
};
