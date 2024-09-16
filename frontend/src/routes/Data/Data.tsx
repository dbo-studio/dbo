import StatusBar from '@/components/shared/StatusBar/StatusBar';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box } from '@mui/material';
import { Suspense, lazy, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import Filters from './Filters/Filters';
import QueryPreview from './QueryPreview/QueryPreview';
import Sorts from './Sorts/Sorts';

const DBDataGrid = lazy(() => import('@/components/shared/DBDataGrid/DBDataGrid'));

export default function Data() {
  const location = useLocation();
  const { loading, getRows, getColumns, runQuery } = useDataStore();
  const { getSelectedTab } = useTabStore();

  useEffect(() => {
    if (getRows().length === 0 || getColumns().length === 0) {
      runQuery();
    }
  }, [location]);

  useEffect(() => {
    console.log(getSelectedTab());
  }, []);

  return (
    getSelectedTab() && (
      <>
        <ActionBar />
        {getSelectedTab()?.showFilters && <Filters />}
        {getSelectedTab()?.showSorts && <Sorts />}
        {getSelectedTab()?.showQuery && <QueryPreview />}
        <Box overflow='hidden' flex={1} display='flex' flexDirection='row'>
          {getSelectedTab()?.showColumns && <Columns />}
          <Suspense>
            <DBDataGrid rows={getRows()} columns={getColumns(true, true)} loading={loading} />
          </Suspense>
        </Box>
        <StatusBar tab={getSelectedTab()} />
      </>
    )
  );
}
