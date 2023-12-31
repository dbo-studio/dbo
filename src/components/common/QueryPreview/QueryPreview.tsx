import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box, Theme, useTheme } from '@mui/material';
import CodeEditor from '../../base/CodeEditor/CodeEditor';

export default function QueryPreview() {
  const { selectedTab } = useTabStore();
  const theme: Theme = useTheme();

  return (
    <Box className='query-preview' borderBottom={`1px solid ${theme.palette.divider}`}>
      {selectedTab && <CodeEditor value={selectedTab?.query} editable={false} />}
    </Box>
  );
}
