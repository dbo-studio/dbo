import CodeEditorV2 from '@/components/base/CodeEditorV2/CodeEditorV2';
import DBDataGrid from '@/components/shared/DBDataGrid/DBDataGrid';
import { useClickAway } from '@/hooks/useClickAway.hook';
import { useDebounce } from '@/hooks/useDebounce.hook';
import { useWindowSize } from '@/hooks/useWindowSize.hook';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import { QueryEditorProps } from '../types';

export default function QueryEditor({ setting }: QueryEditorProps) {
  const theme = useTheme();
  const windowSize = useWindowSize();
  const { getRows } = useDataStore();
  const { updateSelectedTab, selectedTab } = useTabStore();
  const [query, setQuery] = useState(selectedTab?.query);
  const debouncedQuery = useDebounce(query, 200);

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
        <CodeEditorV2
          database={setting.database}
          schema={setting.schema}
          value={selectedTab?.query ?? ''}
          onChange={handleChangeValue}
        />
        {/* <CodeEditor autocomplete={autoComplete} value={selectedTab?.query} onChange={handleChangeValue} /> */}
      </Box>
      {getRows() && getRows().length > 0 && <DBDataGrid />}
    </Box>
  );
}
