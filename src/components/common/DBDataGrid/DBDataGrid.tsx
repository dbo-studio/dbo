import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import DataGrid, { SelectColumn, textEditor } from 'react-data-grid';
import { makeData } from './makeData';
import './styles.css';
import { ColumnType } from './types';

export default function DBDataGrid() {
  const [selectedRows, setSelectedRows] = useState((): ReadonlySet<number> => new Set());
  const [isLoading, setIsLoading] = useState(false);
  const { selectedTab } = useTabStore();
  const { updateRows, updateColumns, updateSelectedRow, getRows, getColumns } = useDataStore();

  useEffect(() => {
    if (!selectedTab) {
      return;
    }

    if (getRows().length == 0 || getColumns().length == 0) {
      const data = makeData(100);
      updateRows(data.rows);
      updateColumns(getServerColumns(data.columns));
    }
  }, [selectedTab]);

  function getServerColumns(serverColumns: ColumnType[]): any {
    const arr: any = [];
    serverColumns!.forEach((column: ColumnType) => {
      arr.push({
        key: column.felid,
        name: column.felid,
        type: column.type,
        resizable: true,
        isActive: true,
        renderEditCell: textEditor
      });
    });

    return arr;
  }

  function formatColumns(serverColumns: any[]): any {
    const newColumns = serverColumns;
    if (newColumns[0] != SelectColumn) {
      newColumns.unshift(SelectColumn);
    }

    return newColumns.filter((c: any) => c.isActive);
  }

  const handleOnCellClick = (e: any) => {
    if (e.rowIdx == -1) {
      return;
    }
    updateSelectedRow(e.row);
  };

  return isLoading ? (
    <span>Loading</span>
  ) : (
    <Box overflow='hidden' display={'flex'} flexDirection={'column'} flex={1}>
      {selectedTab && (
        <DataGrid
          onSelectedCellChange={handleOnCellClick}
          rowKeyGetter={rowKeyGetter}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
          columns={formatColumns(getColumns())}
          rows={getRows()}
          rowHeight={30}
          onRowsChange={updateRows}
          headerRowHeight={30}
        />
      )}
    </Box>
  );
}

function rowKeyGetter(row: any) {
  return row.id;
}
