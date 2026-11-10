import type { ColumnType } from '@/types';
import { useMemo } from 'react';

export type UseDataGridColumnsProps = {
  columns: ColumnType[];
  columnSizes: Record<string, number>;
  /** Rows can be picked with a checkbox column; off when nothing can act on a selection. */
  selectable?: boolean;
};

export type UseDataGridColumnsReturn = {
  tableColumns: ColumnType[];
  totalTableWidth: number;
};

export function useDataGridColumns({
  columns,
  columnSizes,
  selectable = true
}: UseDataGridColumnsProps): UseDataGridColumnsReturn {
  const tableColumns = useMemo((): ColumnType[] => {
    if (!selectable) return columns;
    return [
      {
        name: 'select',
        type: 'checkbox',
        isActive: true,
        isPrimaryKey: false,
        notNull: false,
        length: '1',
        comment: '',
        default: '',
        mappedType: 'unknown'
      },
      ...columns
    ];
  }, [columns, selectable]);

  const totalTableWidth = useMemo(() => {
    return Object.entries(columnSizes).reduce(
      (total, [name, width]) => (name === 'select' && !selectable ? total : total + width),
      0
    );
  }, [columnSizes, selectable]);

  return {
    tableColumns,
    totalTableWidth
  };
}
