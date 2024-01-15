import Search from '@/src/components/base/Search/Search';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import FieldInput from '../../base/FieldInput/FieldInput';

export default function DBFields() {
  const { getColumns, getSelectedRow } = useDataStore();
  const [fields, setFields] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    generateFields();
  }, [getSelectedRow()]);

  const handleSearch = (name: string) => {
    setSearch(name);
    generateFields();
  };

  function generateFields() {
    const row = getSelectedRow();
    if (!row) {
      return;
    }

    const data: any[] = [];
    getColumns()
      .filter((c: any) => {
        return c.name.includes(search);
      })
      .map((c: any, index: number) => {
        if (!row.hasOwnProperty(c.key)) return;
        data.push({
          value: row[c.key] ?? null,
          ...c
        });
      });

    setFields(data);
  }

  return (
    <>
      <Search onChange={handleSearch} />
      <Box mt={1}>
        {getSelectedRow() &&
          fields.map(
            (item, index) =>
              item.name && (
                <FieldInput
                  value={item.value}
                  fullWidth={true}
                  key={index}
                  label={item.name}
                  typeLabel={item.type}
                  type={item.type}
                />
              )
          )}
      </Box>
    </>
  );
}
