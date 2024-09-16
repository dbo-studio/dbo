import { handelRowChangeLog } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store';
import { Box, Checkbox, CircularProgress } from '@mui/material';
import type React from 'react';
import { useEffect, useRef } from 'react';
import type { DataGridHandle, RenderCheckboxProps, RowsChangeData } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { useSearchParams } from 'react-router-dom';
import { DataGridStyled } from './DataGrid.styled';
import { DataGridWrapperStyled } from './DataGridWrapper.styled';
import type { DBDataGridProps } from './types';

export default function DBDataGrid({ rows, columns, loading }: DBDataGridProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const dataGridRef = useRef<DataGridHandle>(null);

  const {
    updateRows,
    updateHighlightedRow,
    getSelectedRows,
    updateSelectedRows,
    getEditedRows,
    updateEditedRows,
    getUnsavedRows,
    getRemovedRows
  } = useDataStore();

  const handleOnCellClick = (e: any) => {
    if (e.rowIdx === -1) {
      return;
    }
    updateHighlightedRow(e.row);
  };

  const handleRowsChange = (rows: any[], data: RowsChangeData<any, unknown>) => {
    const oldRow: any = rows[data.indexes[0]];
    const newRow = rows[data.indexes[0]];
    const editedRows = handelRowChangeLog(getEditedRows(), oldRow, newRow);
    updateEditedRows(editedRows);
    updateRows(rows);
  };

  const scrollToBottom = () => {
    dataGridRef.current?.scrollToCell({
      rowIdx: rows.length - 1
    });

    setSearchParams({ scrollToBottom: 'false' });
  };

  useEffect(() => {
    const params = Object.fromEntries([...searchParams]);
    if (params?.scrollToBottom) {
      scrollToBottom();
    }
  }, [searchParams]);

  return loading ? (
    <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
      <CircularProgress size={30} />
    </Box>
  ) : (
    <DataGridWrapperStyled>
      <DataGridStyled
        ref={dataGridRef}
        onSelectedCellChange={handleOnCellClick}
        rowKeyGetter={rowKeyGetter}
        selectedRows={getSelectedRows()}
        onSelectedRowsChange={updateSelectedRows}
        columns={columns}
        rows={rows}
        rowHeight={30}
        onRowsChange={handleRowsChange}
        headerRowHeight={30}
        renderers={{ renderCheckbox }}
        rowClass={(_, index) => {
          if (getRemovedRows().some((v) => v.dbo_index === index)) {
            return 'removed-highlight';
          }
          if (getUnsavedRows().some((v) => v.dbo_index === index)) {
            return 'unsaved-highlight';
          }
          if (getEditedRows().some((v) => v.dboIndex === index)) {
            return 'edit-highlight';
          }
          return undefined;
        }}
      />
    </DataGridWrapperStyled>
  );
}

function rowKeyGetter(row: any) {
  return row?.dbo_index ?? Math.random();
}

function renderCheckbox({ onChange, ...props }: RenderCheckboxProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.checked, (e.nativeEvent as MouseEvent).shiftKey);
  }

  return <Checkbox size='small' style={{ padding: 0 }} {...props} onChange={handleChange} />;
}
