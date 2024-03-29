import { tools } from '@/src/core/utils';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box, useTheme } from '@mui/material';
import CodeEditor from '../../../../../base/CodeEditor/CodeEditor';
import DBDataGrid from '../../../../../shared/DBDataGrid/DBDataGrid';

export default function QueryEditor() {
  const theme = useTheme();
  const { getRows } = useDataStore();
  const { updateSelectedTab, selectedTab } = useTabStore();

  const handleChangeValue = (value: string) => {
    updateSelectedTab({
      ...selectedTab!,
      query: value
    });
  };

  return (
    <Box display={'flex'} flexDirection={'column'} height={tools.screenMaxHeight()}>
      <Box flex={1} borderBottom={`1px solid ${theme.palette.divider}`}>
        <CodeEditor value={selectedTab?.query} onChange={handleChangeValue} />
      </Box>
      {getRows() && getRows().length > 0 && <DBDataGrid />}
    </Box>
  );
}
