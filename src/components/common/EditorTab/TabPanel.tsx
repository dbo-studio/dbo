import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box } from '@mui/material';
import ActionBar from '../ActionBar/ActionBar';
import DBDataGrid from '../DBDataGrid/DBDataGrid';
import Filters from '../Filters/Filters';
import QueryPreview from '../QueryPreview/QueryPreview';
import StatusBar from '../StatusBar/StatusBar';

export default function TabPanel() {
  const { selectedTab } = useTabStore();
  return (
    <Box position='relative' height='calc(100% - 100px)'>
      <ActionBar />
      {selectedTab!.showFilters && <Filters />}
      {selectedTab!.showQuery && <QueryPreview />}
      <DBDataGrid />
      <StatusBar />
    </Box>
  );
}
