import type { ColumnType } from '@/types';
import { useMemo } from 'react';

export type UseDataGridColumnsProps = {
  columns: ColumnType[];
  columnSizes: Record<string, number>;
};

export type UseDataGridColumnsReturn = {
  tableColumns: ColumnType[];
  totalTableWidth: number;
};

export function useDataGridColumns({ columns, columnSizes }: UseDataGridColumnsProps): UseDataGridColumnsReturn {
  const tableColumns = useMemo((): ColumnType[] => {
    return [
      {
        name: 'select',
        type: 'checkbox',
        isActive: true,
        notNull: false,
        length: '1',
        comment: '',
        default: '',
        mappedType: ''
      },
      ...columns
    ];
  }, [columns]);

  const totalTableWidth = useMemo(() => {
    return Object.values(columnSizes).reduce((total, width) => total + width, 0);
  }, [columnSizes]);

  return {
    tableColumns,
    totalTableWidth
  };
}
