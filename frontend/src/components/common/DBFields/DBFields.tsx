import Search from '@/components/base/Search/Search';
import { useDataStore } from '@/store/dataStore/data.store';
import type { RowType } from '@/types';
import { Box } from '@mui/material';
import { type JSX, useMemo, useState } from 'react';
import { DBFieldItem } from './DBFieldItem/DBFieldItem';

export default function DBFields(): JSX.Element {
  const columns = useDataStore((state) => state.columns);
  const selectedRows = useDataStore((state) => state.selectedRows);
  const rows = useDataStore((state) => state.rows);

  const [search, setSearch] = useState<string>('');

  const selectedRow = useMemo((): RowType | undefined => {
    if (selectedRows.length === 0) {
      return undefined;
    }

    const row = selectedRows[selectedRows.length - 1].row;
    return rows?.find((r) => r.dbo_index === row.dbo_index) ?? row;
  }, [selectedRows, rows]);

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
      <Box
        sx={{
          mt: 1
        }}
      >
        <Search onChange={(value: string): void => setSearch(value)} />
      </Box>
      {selectedRow && filteredColumns.length > 0 && (
        <Box
          data-testid='db-field'
          sx={{
            mt: 1
          }}
        >
          {filteredColumns.map((column) => (
            <DBFieldItem key={column.name} row={selectedRow} column={column} />
          ))}
        </Box>
      )}
    </>
  );
}
