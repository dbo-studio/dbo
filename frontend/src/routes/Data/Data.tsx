import StatusBar from '@/components/shared/StatusBar/StatusBar';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box } from '@mui/material';
import { Suspense, lazy } from 'react';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import Filters from './Filters/Filters';
import QueryPreview from './QueryPreview/QueryPreview';
import Sorts from './Sorts/Sorts';

const DBDataGrid = lazy(() => import('@/components/shared/DBDataGrid/DBDataGrid'));

export default function Data(): JSX.Element {
  const { getSelectedTab } = useTabStore();
  return (
    <>
      <ActionBar />
      {getSelectedTab()?.showFilters && <Filters />}
      {getSelectedTab()?.showSorts && <Sorts />}
      {getSelectedTab()?.showQuery && <QueryPreview />}
      <Box overflow='hidden' flex={1} display='flex' flexDirection='row'>
        {getSelectedTab()?.showColumns && <Columns />}
        <Suspense>
          <DBDataGrid />
        </Suspense>
      </Box>
      <StatusBar />
    </>
  );
}
