import type { FilterOperatorOption } from '@/core/constants';
import type { FilterType } from '@/types';
import type { ColumnType } from '@/types/Data';

export type FilterItemProps = {
  filter: FilterType;
  columns: ColumnType[];
  apply: () => void;
  /** Conditions to offer; the SQL set by default. */
  operators?: FilterOperatorOption[];
};

export type AddFilterButtonProps = {
  columns: ColumnType[];
  operators?: FilterOperatorOption[];
};

export type RemoveFilterButtonProps = {
  filter: FilterType;
  apply: () => void;
};
