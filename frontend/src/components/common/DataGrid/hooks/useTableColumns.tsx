import type { ColumnType } from '@/types';
import { useMemo } from 'react';
import type { CustomColumnDef } from '../types';

export default function useTableColumns({ columns }: { columns: ColumnType[] }): CustomColumnDef[] {
  const tableColumns = useMemo(() => {
    const selectColumn: CustomColumnDef = {
      id: 'select',
      accessor: 'select',
      header: '',
      size: 30,
      minSize: 30,
      maxSize: 30,
      cell: () => <></>
    };

    const processedColumns = columns.map((col) => ({
      ...col,
      id: col.name,
      accessor: col.name
    }));

    return [selectColumn, ...processedColumns];
  }, [columns]);

  return tableColumns as CustomColumnDef[];
}
