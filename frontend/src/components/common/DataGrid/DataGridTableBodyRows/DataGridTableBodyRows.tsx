import type { RowType } from '@/types';
import type { JSX } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { StyledTableRow, TableCell } from '../DataGrid.styled';
import type { DataGridTableBodyRowsProps } from '../types';

export default function DataGridTableBodyRows({
  tableColumns,
  rows,
  context,
  columnSizes,
  removedRows,
  unsavedRows,
  editedRows,
  selectedRows,
  setSelectedRows
}: DataGridTableBodyRowsProps): JSX.Element {
  const [localEditedRows, setLocalEditedRows] = useState<Map<number, Map<string, string>>>(new Map());

  const removedRowsMap = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const row of removedRows) {
      map.set(row.dbo_index, true);
    }
    return map;
  }, [removedRows]);

  const unsavedRowsMap = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const row of unsavedRows) {
      map.set(row.dbo_index, true);
    }
    return map;
  }, [unsavedRows]);

  const editedRowsMap = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const row of editedRows) {
      map.set(row.dboIndex, true);
    }
    return map;
  }, [editedRows]);

  const selectedRowsMap = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const row of selectedRows) {
      map.set(row.index, true);
    }
    return map;
  }, [selectedRows]);

  const handleSelect = useCallback(
    (rowIndex: number, columnId: string, row: RowType): void => {
      setSelectedRows([
        {
          index: rowIndex,
          selectedColumn: columnId,
          row: row
        }
      ]);
    },
    [setSelectedRows]
  );

  const handleRowUpdate = useCallback((rowIndex: number, columnId: string, newValue: string): void => {
    setLocalEditedRows((prev) => {
      const newMap = new Map(prev);
      const rowMap = newMap.get(rowIndex) || new Map();
      rowMap.set(columnId, newValue);
      newMap.set(rowIndex, rowMap);
      return newMap;
    });
  }, []);

  return (
    <tbody>
      {rows.map((row, rowIndex) => {
        const isRemoved = removedRowsMap.has(rowIndex);
        const isUnsaved = unsavedRowsMap.has(rowIndex);
        const isEdited = editedRowsMap.has(rowIndex) || localEditedRows.has(rowIndex);
        const isSelected = selectedRowsMap.has(rowIndex);

        return (
          <StyledTableRow
            key={`row-${row.dbo_index}`}
            className={`
              ${isRemoved ? 'removed-highlight' : ''}
              ${isUnsaved ? 'unsaved-highlight' : ''}
              ${isEdited ? 'edit-highlight' : ''}
              ${isSelected ? 'selected-highlight' : ''}
            `.trim()}
          >
            {tableColumns.map((column) => {
              const columnId = column.id;
              const localValue = localEditedRows.get(rowIndex)?.get(columnId);
              const value = localValue !== undefined ? localValue : row[column.accessor || columnId];

              return (
                <TableCell
                  key={`cell-${rowIndex}-${columnId}`}
                  onContextMenu={(e): void => {
                    context(e);
                    handleSelect(rowIndex, columnId, row);
                  }}
                  style={{
                    width: columnSizes[columnId] || column.size || 200,
                    ...(columnId === 'select'
                      ? {
                          minWidth: '30px',
                          maxWidth: '30px',
                          width: '30px',
                          boxSizing: 'border-box'
                        }
                      : {})
                  }}
                >
                  {column.cell({
                    row,
                    rowIndex: rowIndex,
                    value,
                    onRowUpdate: (newValue: string): void => handleRowUpdate(rowIndex, columnId, newValue)
                  })}
                </TableCell>
              );
            })}
          </StyledTableRow>
        );
      })}
    </tbody>
  );
}
