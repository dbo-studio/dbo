import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box, Checkbox } from '@mui/material';
import { useEffect, useState } from 'react';
import DataGrid, { RenderCheckboxProps, RowsChangeData, SelectColumn } from 'react-data-grid';
import './styles.css';

export default function DBDataGrid() {
  const [selectedRows, setSelectedRows] = useState((): ReadonlySet<number> => new Set());
  const [isLoading, setIsLoading] = useState(false);
  const { selectedTab } = useTabStore();
  const { updateRows, updateColumns, updateSelectedRow, getRows, getColumns, runQuery } = useDataStore();
  const [editHighlight, setEditHighlight] = useState<number | undefined>(undefined);
  const [removeHighlight, setRemoveHighlight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!selectedTab) {
      return;
    }

    if (getRows().length == 0 || getColumns().length == 0) {
      runQuery();
    }
  }, [selectedTab]);

  function formatColumns(serverColumns: any[]): any {
    const newColumns = serverColumns;
    if (newColumns[0] != SelectColumn) {
      newColumns.unshift({
        ...SelectColumn,
        isActive: true
      });
    }
    return newColumns.filter((c: any) => c.isActive);
  }

  const handleOnCellClick = (e: any) => {
    if (e.rowIdx == -1) {
      return;
    }
    updateSelectedRow(e.row);
  };

  const handleRowsChange = (rows: any[], data: RowsChangeData<any, unknown>) => {
    const oldRow = getRows()[data.indexes[0]];
    const newRow = rows[data.indexes[0]];

    setEditHighlight(data.indexes[0]);

    updateRows(rows);
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
          onRowsChange={handleRowsChange}
          headerRowHeight={30}
          renderers={{ renderCheckbox }}
          rowClass={(row, index) => (index == editHighlight ? 'edit-highlight' : undefined)}
        />
      )}
    </Box>
  );
}

function rowKeyGetter(row: any) {
  return row.id;
}

function renderCheckbox({ onChange, ...props }: RenderCheckboxProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.checked, (e.nativeEvent as MouseEvent).shiftKey);
  }

  return <Checkbox size='small' style={{ padding: 0 }} {...props} onChange={handleChange} />;
}
