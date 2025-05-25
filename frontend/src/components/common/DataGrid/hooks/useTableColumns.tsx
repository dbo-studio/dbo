import { useTableData } from '@/contexts/TableDataContext';
import { Checkbox } from '@mui/material';
import { type JSX, useMemo } from 'react';
import { DataGridTableCell } from '../DataGridTableCell/DataGridTableCell';
import type { CustomColumnDef, TableColumnsProps } from '../types';
import { useRowSelection } from './useRowSelection';

export default function useTableColumns({
  rows,
  columns,
  editingCell,
  setEditingCell,
  updateEditedRows,
  updateRow,
  editedRows
}: TableColumnsProps): CustomColumnDef[] {
  const { selectedRows, setSelectedRows } = useTableData();
  const { handleRowSelection } = useRowSelection(rows, selectedRows, setSelectedRows);

  return useMemo((): CustomColumnDef[] => {
    const checkboxColumn: CustomColumnDef = {
      id: 'select',
      header: (
        <Checkbox
          sx={{ padding: 0 }}
          size={'small'}
          checked={selectedRows.length === rows.length && rows.length > 0}
          indeterminate={selectedRows.length > 0 && selectedRows.length < rows.length}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
            if (e.target.checked) {
              const allRows = rows.map((row, index) => ({
                index,
                selectedColumn: '',
                row
              }));
              setSelectedRows(allRows);
            } else {
              setSelectedRows([]);
            }
          }}
        />
      ),
      cell: ({ rowIndex }) => {
        const isSelected = selectedRows.some((sr) => sr.index === rowIndex);

        return (
          <Checkbox
            sx={{ padding: 0 }}
            size={'small'}
            checked={isSelected}
            onChange={(e: React.ChangeEvent<HTMLInputElement>, checked: boolean): void => {
              handleRowSelection(rowIndex, checked, e.nativeEvent as unknown as React.MouseEvent);
            }}
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
            }}
          />
        );
      },
      size: 30,
      minSize: 30,
      maxSize: 30
    };

    const dataColumns = columns.map(
      (col) =>
        ({
          id: col.name,
          accessor: col.name,
          header: col.name,
          minSize: 200,
          cell: ({ row, rowIndex, value }): JSX.Element => {
            const columnId = col.name;
            const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === columnId;

            return (
              <DataGridTableCell
                row={row}
                rowIndex={rowIndex}
                columnId={columnId}
                value={value}
                isEditing={isEditing}
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                editedRows={editedRows}
                updateEditedRows={updateEditedRows}
                updateRow={updateRow}
                setSelectedRows={setSelectedRows}
              />
            );
          }
        }) as CustomColumnDef
    );

    return [checkboxColumn, ...dataColumns];
  }, [rows, editingCell, columns, selectedRows, handleRowSelection]);
}
