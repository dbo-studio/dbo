import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box } from '@mui/material';
import ActionBar from '../ActionBar/ActionBar';
import Columns from '../Columns/Columns';
import DBDataGrid from '../DBDataGrid/DBDataGrid';
import Filters from '../Filters/Filters';
import QueryPreview from '../QueryPreview/QueryPreview';
import Sorts from '../Sorts/Sorts';
import StatusBar from '../StatusBar/StatusBar';

export default function TabPanel() {
  const { selectedTab } = useTabStore();
  return (
    <Box overflow='hidden' display='flex' flexDirection='column'>
      <ActionBar />
      {selectedTab!.showFilters && <Filters />}
      {selectedTab!.showSorts && <Sorts />}
      {selectedTab!.showQuery && <QueryPreview />}
      <Box overflow='hidden' display='flex' flexDirection='row'>
        {selectedTab!.showColumns && <Columns />}
        <DBDataGrid />
      </Box>
      <StatusBar />
    </Box>
  );
}
