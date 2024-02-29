import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box, Checkbox, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import DataGrid, { RenderCheckboxProps, RowsChangeData } from 'react-data-grid';
import './styles.css';

export default function DBDataGrid() {
  const [selectedRows, setSelectedRows] = useState((): ReadonlySet<number> => new Set());
  const [isLoading, setIsLoading] = useState(false);
  const { selectedTab } = useTabStore();
  const { updateRows, updateSelectedRow, getRows, getColumns, runQuery } = useDataStore();
  const [editHighlight, setEditHighlight] = useState<number | undefined>(undefined);
  const [removeHighlight, setRemoveHighlight] = useState<number | undefined>(undefined);

  const getData = async () => {
    setIsLoading(true);
    await runQuery();
    setIsLoading(false);
  };

  useEffect(() => {
    if (getRows().length == 0 || getColumns().length == 0) {
      getData();
    }
  }, [selectedTab]);

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
    <Box display={'flex'} justifyContent={'center'} alignItems={'center'} flex={1}>
      <CircularProgress size={30} />
    </Box>
  ) : (
    <Box overflow='hidden' display={'flex'} flexDirection={'column'} flex={1}>
      {selectedTab && (
        <DataGrid
          onSelectedCellChange={handleOnCellClick}
          rowKeyGetter={rowKeyGetter}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
          columns={getColumns(true)}
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
