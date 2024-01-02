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
  const { updateRows, updateColumns, selectedTab } = useTabStore();

  useEffect(() => {
    if (selectedTab?.rows.length == 0) {
      const data = makeData(250);
      updateRows(data.rows);
      updateColumns(getColumns(data.columns));
    }
  }, [selectedTab]);

  function getColumns(serverColumns: ColumnType[]): any {
    const arr: any = [];
    serverColumns!.forEach((column: ColumnType) => {
      arr.push({
        key: column.felid,
        name: column.felid,
        type: column.type,
        resizable: true,
        renderEditCell: textEditor
      });
    });

    return arr;
  }

  function formatColumns(serverColumns: any[]): any {
    const newColumns = serverColumns;
    if (newColumns[0] != SelectColumn) {
      newColumns[0] = SelectColumn;
    }
    return newColumns;
  }

  return isLoading ? (
    <span>Loading</span>
  ) : (
    <Box height='calc(100vh - 285px)' overflow='scroll'>
      {selectedTab && (
        <DataGrid
          rowKeyGetter={rowKeyGetter}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
          columns={formatColumns(selectedTab.columns)}
          rows={selectedTab.rows}
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
