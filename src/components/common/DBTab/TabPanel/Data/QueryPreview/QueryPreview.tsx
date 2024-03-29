import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box, Theme, useTheme } from '@mui/material';
import BaseEditor from '../../../../../base/CodeEditor/BaseEditor';

export default function QueryPreview() {
  const { selectedTab } = useTabStore();
  const theme: Theme = useTheme();

  return (
    <Box className='query-preview' borderBottom={`1px solid ${theme.palette.divider}`}>
      {selectedTab && <BaseEditor value={selectedTab?.query} editable={false} />}
    </Box>
  );
}
