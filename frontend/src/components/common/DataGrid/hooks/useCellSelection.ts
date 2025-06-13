import { useCallback, useRef } from 'react';
import type { CellSelectionReturn } from '../types';

export const useCellSelection = (
  row: any,
  rowIndex: number,
  columnId: string,
  setSelectedRows: (rows: any) => Promise<void>
): CellSelectionReturn => {
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSelect = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      setSelectedRows([
        {
          index: rowIndex,
          selectedColumn: columnId,
          row
        }
      ]);
    },
    [row, rowIndex, columnId, setSelectedRows]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent, setEditingCell: (cell: { rowIndex: number; columnId: string } | null) => void): void => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;

        setEditingCell({ rowIndex, columnId });
        handleSelect(e);
      } else {
        clickTimeoutRef.current = setTimeout(() => {
          handleSelect(e);
          clickTimeoutRef.current = null;
        }, 250);
      }
    },
    [handleSelect, rowIndex, columnId]
  );

  return {
    handleClick
  };
};
