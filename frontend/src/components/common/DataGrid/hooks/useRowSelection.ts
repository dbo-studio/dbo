import type { RowType } from '@/types';
import { useCallback, useMemo, useState } from 'react';
import type { RowSelectionReturn } from '../types';

export const useRowSelection = (
  rows: RowType[],
  selectedRows: any[],
  setSelectedRows: (rows: any) => Promise<void>
): RowSelectionReturn => {
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Create a Map for O(1) lookups of selected rows
  const selectedRowsMap = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const row of selectedRows) {
      map.set(row.index, true);
    }
    return map;
  }, [selectedRows]);

  const handleRowSelection = useCallback(
    (rowIndex: number, isSelected: boolean, _: React.MouseEvent): void => {
      if (isSelected && !selectedRowsMap.has(rowIndex)) {
        setSelectedRows([
          ...selectedRows,
          {
            index: rowIndex,
            selectedColumn: '',
            row: rows[rowIndex]
          }
        ]);
      } else if (!isSelected && selectedRowsMap.has(rowIndex)) {
        setSelectedRows(selectedRows.filter((sr) => sr.index !== rowIndex));
      }

      setLastSelectedIndex(rowIndex);
    },
    [lastSelectedIndex, rows, selectedRows, selectedRowsMap, setSelectedRows]
  );

  return {
    handleRowSelection
  };
};
