import CodeEditor from '@/src/components/base/CodeEditor/CodeEditor';
import DBDataGrid from '@/src/components/shared/DBDataGrid/DBDataGrid';
import { useClickAway } from '@/src/hooks/useClickAway.hook';
import { useDebounce } from '@/src/hooks/useDebounce.hook';
import { useWindowSize } from '@/src/hooks/useWindowSize.hook';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';

export default function QueryEditor() {
  const theme = useTheme();
  const windowSize = useWindowSize();
  const { getRows, autoComplete } = useDataStore();
  const { updateSelectedTab, selectedTab } = useTabStore();
  const [query, setQuery] = useState(selectedTab?.query);
  const debouncedQuery = useDebounce(query, 300);

  const ref = useClickAway(() => {
    if (selectedTab?.query !== query) handleUpdateState();
  });

  const handleChangeValue = (value: string) => {
    setQuery(value);
  };

  const handleUpdateState = () => {
    if (debouncedQuery) {
      updateSelectedTab({
        ...selectedTab!,
        query: query ?? ''
      });
    }
  };

  useEffect(() => {
    handleUpdateState();
  }, [debouncedQuery]);

  return (
    <Box ref={ref} display={'flex'} flexDirection={'column'} height={windowSize.height}>
      <Box flex={1} borderBottom={`1px solid ${theme.palette.divider}`}>
        <CodeEditor autocomplete={autoComplete} value={selectedTab?.query} onChange={handleChangeValue} />
      </Box>
      {getRows() && getRows().length > 0 && <DBDataGrid />}
    </Box>
  );
}
