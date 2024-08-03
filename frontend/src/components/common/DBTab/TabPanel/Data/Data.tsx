import StatusBar from '@/components/shared/StatusBar/StatusBar';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box } from '@mui/material';
import { lazy, Suspense } from 'react';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import Filters from './Filters/Filters';
import QueryPreview from './QueryPreview/QueryPreview';
import Sorts from './Sorts/Sorts';

const DBDataGrid = lazy(() => import('@/components/shared/DBDataGrid/DBDataGrid'));
const DataGrid = lazy(() => import('@/components/shared/DataGrid/DataGrid'));

export default function Data() {
  const { selectedTab } = useTabStore();

  return (
    selectedTab && (
      <>
        <ActionBar />
        {selectedTab.showFilters && <Filters />}
        {selectedTab.showSorts && <Sorts />}
        {selectedTab.showQuery && <QueryPreview />}
        <Box overflow='hidden' flex={1} display='flex' flexDirection='row'>
          {selectedTab.showColumns && <Columns />}
          <Suspense>
            {/* <DBDataGrid /> */}
            <DataGrid />
          </Suspense>
        </Box>
        <StatusBar />
      </>
    )
  );
}
