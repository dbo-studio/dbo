import type { SortType } from '@/types';
import type { ColumnType } from '@/types/Data';

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
