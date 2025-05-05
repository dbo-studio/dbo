import { TabMode } from '@/core/enums';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import Sorts from '@/routes/Data/Sorts/Sorts.tsx';
import { useDataStore } from '@/store/dataStore/data.store';
import { Box } from '@mui/material';
import { type JSX, Suspense, lazy, useEffect, useMemo } from 'react';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import Filters from './Filters/Filters';
import QueryPreview from './QueryPreview/QueryPreview';
import StatusBar from './StatusBar/StatusBar';

const TestGrid = lazy(() => import('@/components/common/DBDataGrid/TestGrid/TestGrid'));

export default function Data(): JSX.Element {
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();

  const rows = useDataStore((state) => (selectedTab?.id ? state.rows[selectedTab.id] : []));
  const { getColumns, isDataFetching, runQuery } = useDataStore();

  const columns = useMemo(() => getColumns(true), [selectedTab?.id]);

  useEffect(() => {
    if (selectedTab?.mode === TabMode.Data && selectedTab?.id) {
      if (!rows || !rows.length || !columns.length) {
        runQuery();
      }
    }
  }, [selectedTab?.id]);

  const grid = useMemo(() => {
    if (columns.length === 0) return <></>;

    return <TestGrid rows={rows} columns={columns} loading={isDataFetching} />;
  }, [rows, columns, isDataFetching]);

  if (!selectedTab || !currentConnection) {
    return <></>;
  }

  return (
    <>
      <ActionBar />
      {selectedTab?.showFilters && <Filters />}
      {selectedTab?.showSorts && <Sorts />}
      {selectedTab?.showQuery && <QueryPreview />}
      <Box overflow='hidden' flex={1} display='flex' flexDirection='row'>
        {selectedTab?.showColumns && <Columns />}
        <Suspense>{grid}</Suspense>
      </Box>
      <StatusBar />
    </>
  );
}
