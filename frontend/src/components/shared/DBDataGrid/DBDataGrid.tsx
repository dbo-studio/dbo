import { TabMode } from '@/core/enums';
import { handelRowChangeLog } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Checkbox, CircularProgress } from '@mui/material';
import React, { useEffect } from 'react';
import { RenderCheckboxProps, RowsChangeData } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { DataGridStyled } from './DataGrid.styled';
import { DataGridWrapperStyled } from './DataGridWrapper.styled';

export default function DBDataGrid() {
  const { selectedTab } = useTabStore();
  const {
    loading,
    updateRows,
    updateHighlightedRow,
    getRows,
    getColumns,
    runQuery,
    getSelectedRows,
    updateSelectedRows,
    getEditedRows,
    updateEditedRows,
    getUnsavedRows,
    getRemovedRows
  } = useDataStore();

  const getData = async () => {
    await runQuery();
  };

  useEffect(() => {
    if (selectedTab?.mode == TabMode.Data && (getRows().length == 0 || getColumns().length == 0)) {
      getData();
    }
  }, [selectedTab?.id]);

  const handleOnCellClick = (e: any) => {
    if (e.rowIdx == -1) {
      return;
    }
    updateHighlightedRow(e.row);
  };

  const handleRowsChange = (rows: any[], data: RowsChangeData<any, unknown>) => {
    const oldRow: any = getRows()[data.indexes[0]];
    const newRow = rows[data.indexes[0]];
    const editedRows = handelRowChangeLog(getEditedRows(), oldRow, newRow);
    updateEditedRows(editedRows);
    updateRows(rows);
  };

  return loading ? (
    <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
      <CircularProgress size={30} />
    </Box>
  ) : (
    <DataGridWrapperStyled>
      {selectedTab && (
        <DataGridStyled
          onSelectedCellChange={handleOnCellClick}
          rowKeyGetter={rowKeyGetter}
          selectedRows={getSelectedRows()}
          onSelectedRowsChange={updateSelectedRows}
          columns={getColumns(true, true)}
          rows={getRows()}
          rowHeight={30}
          onRowsChange={handleRowsChange}
          headerRowHeight={30}
          renderers={{ renderCheckbox }}
          rowClass={(_, index) => {
            if (getRemovedRows().some((v) => v.dbo_index == index)) {
              return 'removed-highlight';
            }
            if (getUnsavedRows().some((v) => v.dbo_index == index)) {
              return 'unsaved-highlight';
            }
            if (getEditedRows().some((v) => v.dboIndex == index)) {
              return 'edit-highlight';
            }
            return undefined;
          }}
        />
      )}
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
