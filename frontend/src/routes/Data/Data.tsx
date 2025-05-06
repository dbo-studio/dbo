import TestGrid from '@/components/common/DBDataGrid/TestGrid/TestGrid';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import Sorts from '@/routes/Data/Sorts/Sorts.tsx';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box } from '@mui/material';
import { type JSX, useEffect, useMemo } from 'react';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import Filters from './Filters/Filters';
import QueryPreview from './QueryPreview/QueryPreview';
import StatusBar from './StatusBar/StatusBar';

export default function Data(): JSX.Element {
  const selectedTab = useSelectedTab();

  const { getColumns, isDataFetching, runQuery, getRows } = useDataStore();
  const { selectedTabId } = useTabStore();

  const columns = useMemo(() => getColumns(true), [selectedTabId]);

  useEffect(() => {
    const rows = getRows();
    if (!getRows() || !rows.length || !columns.length) {
      runQuery();
    }
  }, [selectedTabId]);

  return (
    <>
      <ActionBar />
      {selectedTab?.showFilters && <Filters />}
      {selectedTab?.showSorts && <Sorts />}
      {selectedTab?.showQuery && <QueryPreview />}
      <Box overflow='hidden' flex={1} display='flex' flexDirection='row'>
        {selectedTab?.showColumns && <Columns />}
        {columns.length > 0 && <TestGrid rows={getRows()} columns={getColumns(true)} loading={isDataFetching} />}
      </Box>
      <StatusBar />
    </>
  );
}
