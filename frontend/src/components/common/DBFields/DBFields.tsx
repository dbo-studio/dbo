import Search from '@/components/base/Search/Search';
import { useDataStore } from '@/store/dataStore/data.store';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import FieldInput from '../../base/FieldInput/FieldInput';

export default function DBFields() {
  const { getColumns, getHighlightedRow } = useDataStore();
  const [fields, setFields] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    generateFields();
  }, [getHighlightedRow()]);

  const handleSearch = (name: string) => {
    setSearch(name);
    generateFields();
  };

  function generateFields() {
    const row = getHighlightedRow();
    if (!row) {
      return;
    }

    const data: any[] = [];
    getColumns()
      .filter((c: any) => {
        return c.name.includes(search);
      })
      .map((c: any) => {
        if (!Object.prototype.hasOwnProperty.call(row, c.key)) return;
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
        {getHighlightedRow() &&
          fields.map(
            (item, index) =>
              item.name && (
                <FieldInput
                  size='small'
                  value={item.value}
                  fullWidth={true}
                  key={`${item.key}_${index}`}
                  label={item.name}
                  typelabel={item.type}
                  type={item.type}
                />
              )
          )}
      </Box>
    </>
  );
}
