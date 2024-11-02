import { TabMode } from '@/core/enums';
import { handelRowChangeLog } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Checkbox, CircularProgress } from '@mui/material';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { DataGridHandle, RenderCheckboxProps, RowsChangeData, SortColumn, SortDirection } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { DataGridStyled } from './DataGrid.styled';
import { DataGridWrapperStyled } from './DataGridWrapper.styled';

export default function DBDataGrid() {
  const { getSelectedTab, updateSorts } = useTabStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const dataGridRef = useRef<DataGridHandle>(null);

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

  useEffect(() => {
    if (getSelectedTab()?.mode === TabMode.Data && (getRows().length === 0 || getColumns().length === 0)) {
      runQuery().then();
    }
  }, [getSelectedTab()?.id]);

  const handleOnCellClick = (e: any) => {
    if (e.rowIdx === -1) {
      return;
    }
    updateHighlightedRow(e.row);
  };

  const handleRowsChange = (rows: any[], data: RowsChangeData<any>) => {
    const oldRow: any = getRows()[data.indexes[0]];
    const newRow = rows[data.indexes[0]];
    const editedRows = handelRowChangeLog(getEditedRows(), oldRow, newRow);
    updateEditedRows(editedRows);
    updateRows(rows).then();
  };

  const scrollToBottom = () => {
    dataGridRef.current?.scrollToCell({
      rowIdx: getRows().length - 1
    });

    setSearchParams({ ...searchParams, scrollToBottom: 'false' });
  };

  useEffect(() => {
    const params = Object.fromEntries([...searchParams]);
    if (params?.scrollToBottom) {
      scrollToBottom();
    }
  }, [searchParams]);

  const handleChangeSorts = (sortColumns: SortColumn[]) => {
    if (sortColumns.length === 0) {
      updateSorts([]);
    } else {
      updateSorts([
        {
          index: uuidv4(),
          column: sortColumns[0].columnKey,
          operator: sortColumns[0].direction,
          isActive: true
        }
      ]);
    }

    runQuery().then();
  };

  useEffect(() => {
    const sorts = getSelectedTab()?.sorts ?? [];

    if (sorts.length === 0) {
      setSortColumns([]);
      return;
    }

    const sortItems: SortColumn[] = [];
    for (const sort of sorts) {
      sortItems.push({
        columnKey: sort.column,
        direction: sort.operator as SortDirection
      });
    }
    setSortColumns(sortItems);
  }, [getSelectedTab()?.sorts]);

  return loading ? (
    <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
      <CircularProgress size={30} />
    </Box>
  ) : (
    <DataGridWrapperStyled>
      <DataGridStyled
        defaultColumnOptions={{
          sortable: getSelectedTab()?.mode === TabMode.Data
        }}
        sortColumns={sortColumns}
        onSortColumnsChange={(sortColumns: SortColumn[]) => {
          setSortColumns(sortColumns);
          handleChangeSorts(sortColumns);
        }}
        ref={dataGridRef}
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
