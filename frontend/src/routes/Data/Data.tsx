import TestGrid from '@/components/common/DBDataGrid/TestGrid/TestGrid';
import { TabMode } from '@/core/enums';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import Sorts from '@/routes/Data/Sorts/Sorts.tsx';
import { useDataStore } from '@/store/dataStore/data.store';
import { Box } from '@mui/material';
import { type JSX, useEffect, useMemo } from 'react';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import Filters from './Filters/Filters';
import QueryPreview from './QueryPreview/QueryPreview';
import StatusBar from './StatusBar/StatusBar';

export default function Data(): JSX.Element {
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();
  const { getRows, getColumns, isDataFetching, runQuery } = useDataStore();

  // const rows = useMemo(() => getRows(), [getRows(), selectedTab?.id]);
  const columns = useMemo(() => getColumns(true), [isDataFetching, selectedTab?.id]);

  useEffect(() => {
    if (selectedTab?.mode === TabMode.Data && (getRows().length === 0 || columns.length === 0)) {
      runQuery().then();
    }
  }, [selectedTab?.id]);

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
        <TestGrid rows={getRows()} columns={columns} />
      </Box>
      <StatusBar />
    </>
  );
}
