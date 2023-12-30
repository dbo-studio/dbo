import { useAppStore } from '@/src/store/zustand';
import { Box, Theme, useTheme } from '@mui/material';
import CodeEditor from '../../base/CodeEditor/CodeEditor';

export default function QueryPreview() {
  const { selectedTab } = useAppStore();
  const theme: Theme = useTheme();

  return (
    <Box borderBottom={`1px solid ${theme.palette.divider}`}>
      {selectedTab && <CodeEditor value={selectedTab?.query} editable={false} />}
    </Box>
  );
}
