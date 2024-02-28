import { SortType } from '@/src/types';
import { ColumnType } from '@/src/types/Data';

export type SortItemProps = {
  sort: SortType;
  columns: ColumnType[];
};

export type AddSortButtonProps = {
  columns: ColumnType[];
};

export type RemoveSortButtonProps = {
  sort: SortType;
};
