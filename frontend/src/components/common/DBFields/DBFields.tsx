import Search from '@/components/base/Search/Search';
import { useDataStore } from '@/store/dataStore/data.store';
import type { RowType } from '@/types';
import { Box } from '@mui/material';
import { type JSX, useEffect, useMemo, useState } from 'react';
import { DBFieldItem } from './DBFieldItem/DBFieldItem';

export default function DBFields(): JSX.Element {
  const columns = useDataStore((state) => state.columns);
  const selectedRows = useDataStore((state) => state.selectedRows);
  const rows = useDataStore((state) => state.rows);

  const [search, setSearch] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<RowType | undefined>(undefined);

  useEffect(() => {
    if (selectedRows.length === 0) {
      setSelectedRow(undefined);
      return;
    }

    const row = selectedRows[selectedRows.length - 1].row;
    const latestRow = rows?.find((r) => r.dbo_index === row.dbo_index) ?? row;

    // Update if it's a different row or if the row data has changed
    if (!selectedRow || latestRow.dbo_index !== selectedRow.dbo_index) {
      setSelectedRow(latestRow);
    } else {
      // Check if any field values have changed
      const hasChanges = columns?.some((col) => {
        const oldValue = selectedRow[col.name];
        const newValue = latestRow[col.name];
        return oldValue !== newValue;
      });

      if (hasChanges) {
        setSelectedRow(latestRow);
      }
    }
  }, [selectedRows, rows, selectedRow, columns]);

  const filteredColumns = useMemo(() => {
    if (!selectedRow || !columns) return [];

    const searchLower = search.toLowerCase();
    return columns.filter((column) => {
      const hasValue = selectedRow[column.name] !== undefined && selectedRow[column.name] !== null;
      const matchesSearch = column.name.toLowerCase().includes(searchLower);
      return hasValue && matchesSearch;
    });
  }, [selectedRow, columns, search]);

  return (
    <>
      <Box mt={1}>
        <Search onChange={(value: string): void => setSearch(value)} />
      </Box>
      {selectedRow && filteredColumns.length > 0 && (
        <Box mt={1} data-testid='db-field'>
          {filteredColumns.map((column) => (
            <DBFieldItem key={column.name} row={selectedRow} column={column} />
          ))}
        </Box>
      )}
    </>
  );
}
