import { useAppStore } from '@/src/store/zustand';
import { Box } from '@mui/material';
import StatusBar from '../StatusBar/StatusBar';

export default function TabPanel() {
  const { selectedTab } = useAppStore();
  return (
    <Box position='relative' height='calc(100% - 100px)'>
      {/* <ActionBar /> */}
      {/* {selectedTab!.showFilters && <Filters />}
      {selectedTab!.showQuery && <QueryPreview />} */}
      {/* <DBDataGrid /> */}
      <StatusBar />
    </Box>
  );
}
