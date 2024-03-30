import CodeEditor from '@/src/components/base/CodeEditor/CodeEditor';
import DBDataGrid from '@/src/components/shared/DBDataGrid/DBDataGrid';
import { useWindowSize } from '@/src/hooks/useWindowSize.hook';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box, useTheme } from '@mui/material';

export default function QueryEditor() {
  const theme = useTheme();
  const windowSize = useWindowSize();
  const { getRows } = useDataStore();
  const { updateSelectedTab, selectedTab } = useTabStore();

  const handleChangeValue = (value: string) => {
    updateSelectedTab({
      ...selectedTab!,
      query: value
    });
  };

  return (
    <Box display={'flex'} flexDirection={'column'} height={windowSize.height}>
      <Box flex={1} borderBottom={`1px solid ${theme.palette.divider}`}>
        <CodeEditor value={selectedTab?.query} onChange={handleChangeValue} />
      </Box>
      {getRows() && getRows().length > 0 && <DBDataGrid />}
    </Box>
  );
}
