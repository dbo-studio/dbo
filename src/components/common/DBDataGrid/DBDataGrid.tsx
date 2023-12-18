import { useAppStore } from '@/src/store/zustand';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import DataGrid, { SelectColumn, textEditor } from 'react-data-grid';
import { makeData } from './makeData';
import './styles.css';
import { ServerColumn } from './types';

export default function DBDataGrid() {
  const [selectedRows, setSelectedRows] = useState((): ReadonlySet<number> => new Set());
  const [isLoading, setIsLoading] = useState(true);

  const { updateRows, updateColumns, selectedTab } = useAppStore();

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const data = makeData(250);
      updateRows(data.rows);
      updateColumns(getColumns(data.columns));
      setIsLoading(false);
    }, 0);
  }, []);

  function getColumns(serverColumns: ServerColumn[]): any {
    const arr = [SelectColumn];
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

  return isLoading ? (
    <span>Loading</span>
  ) : (
    <Box height='calc(100vh - 285px)' overflow='scroll'>
      {selectedTab && (
        <DataGrid
          rowKeyGetter={rowKeyGetter}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
          columns={selectedTab.columns}
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
