import Search from '@/src/components/base/Search/Search';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import FieldInput from '../../base/FieldInput/FieldInput';

export default function DBFields() {
  const { selectedTab } = useTabStore();
  const [fields, setFields] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedTab || !selectedTab.columns) {
      return;
    }
    setFields(selectedTab.columns!);
  }, [selectedTab]);

  const handleSearch = (name: string) => {
    if (!selectedTab || !selectedTab.columns) {
      return;
    }

    setFields(
      selectedTab.columns.filter((c: any) => {
        return c.name.includes(name);
      })
    );
  };

  return (
    <>
      <Search onChange={handleSearch} />
      <Box mt={1}>
        {fields.map((item, index) => item.name && <FieldInput key={index} label={item.name} inputType={item.type} />)}
      </Box>
    </>
  );
}
