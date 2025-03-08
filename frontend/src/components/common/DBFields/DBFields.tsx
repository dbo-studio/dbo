import FieldInput from '@/components/base/FieldInput/FieldInput.tsx';
import Search from '@/components/base/Search/Search';
import { useDataStore } from '@/store/dataStore/data.store';
import type { RowType } from '@/types';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';

export default function DBFields() {
  const { getColumns, getSelectedRows } = useDataStore();
  const [fields, setFields] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<RowType | undefined>(undefined);

  useEffect(() => {
    const rows = getSelectedRows();
    if (rows.length === 0) return;

    const row = rows[rows.length - 1].data;
    if (row !== selectedRow) {
      setSelectedRow(row);
    }
  }, [getSelectedRows()]);

  useEffect(() => {
    generateFields(search);
  }, [search, selectedRow]);

  function generateFields(value: string) {
    if (!selectedRow) return;

    const data: any[] = [];
    getColumns()
      .filter((c: any) => {
        return c.name.toLocaleLowerCase().includes(value.toLocaleLowerCase());
      })
      .map((c: any) => {
        if (!selectedRow[c.name]) return;
        data.push({
          value: selectedRow[c.name],
          ...c
        });
      });

    setFields(data);
  }

  return (
    <>
      <Search onChange={(value: string) => setSearch(value)} />
      {fields.length > 0 && (
        <Box mt={1} data-testid='db-field'>
          {fields.map(
            (item, index) =>
              item.name && (
                <FieldInput
                  size='small'
                  value={item.value}
                  fullWidth={true}
                  key={`${item.name}_${index}`}
                  label={item.name}
                  typelabel={item.type}
                  type={item.type}
                />
              )
          )}
        </Box>
      )}
    </>
  );
}
