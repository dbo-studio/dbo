import StatusBar from '@/components/shared/StatusBar/StatusBar';
import { useCurrentTab } from '@/hooks';
import { Box } from '@mui/material';
import { Suspense, lazy } from 'react';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import Filters from './Filters/Filters';
import QueryPreview from './QueryPreview/QueryPreview';
import Sorts from './Sorts/Sorts';

const DBDataGrid = lazy(() => import('@/components/shared/DBDataGrid/DBDataGrid'));

export default function Data() {
  const currentTab = useCurrentTab();

  return (
    currentTab && (
      <>
        <ActionBar />
        {currentTab.showFilters && <Filters />}
        {currentTab.showSorts && <Sorts />}
        {currentTab.showQuery && <QueryPreview />}
        <Box overflow='hidden' flex={1} display='flex' flexDirection='row'>
          {currentTab.showColumns && <Columns />}
          <Suspense>
            <DBDataGrid />
          </Suspense>
        </Box>
        <StatusBar />
      </>
    )
  );
}
