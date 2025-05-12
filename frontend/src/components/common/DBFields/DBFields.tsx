import FieldInput from '@/components/base/FieldInput/FieldInput.tsx';
import Search from '@/components/base/Search/Search';
import { useTableData } from '@/contexts/TableDataContext';
import type { RowType } from '@/types';
import { Box } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';

export default function DBFields(): JSX.Element {
  const { columns, selectedRows } = useTableData();
  const [fields, setFields] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<RowType | undefined>(undefined);

  useEffect(() => {
    if (selectedRows.length === 0) return;

    const row = selectedRows[selectedRows.length - 1].row;
    if (row !== selectedRow) {
      setSelectedRow(row);
    }
  }, [selectedRows, selectedRow]);

  useEffect(() => {
    generateFields(search);
  }, [search, selectedRow]);

  function generateFields(value: string): void {
    if (!selectedRow) return;

    const data: any[] = [];
    columns
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
      <Box mt={1}>
        <Search onChange={(value: string): void => setSearch(value)} />
      </Box>
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
