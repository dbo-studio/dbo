import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import DataGrid, { SelectColumn, textEditor } from 'react-data-grid';
import { makeData } from './makeData';
import './styles.css';
import { ServerColumn } from './types';

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

  function getColumns(serverColumns: ServerColumn[]): any {
    const arr: any = [];
    serverColumns!.forEach((column: ServerColumn) => {
      arr.push({
        key: column.felid,
        name: column.felid,
        resizable: true,
        renderEditCell: textEditor
      });
    });

    return arr;
  }

  function formatColumns(serverColumns: any[]): any {
    if (serverColumns[0] != SelectColumn) {
      serverColumns[0] = SelectColumn;
    }
    return serverColumns;
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
