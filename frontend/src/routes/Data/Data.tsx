import TestGrid from '@/components/common/DBDataGrid/TestGrid/TestGrid';
import {useMount} from '@/hooks';
import {useSelectedTab} from '@/hooks/useSelectedTab.hook';
import Sorts from '@/routes/Data/Sorts/Sorts.tsx';
import {Box} from '@mui/material';
import type {JSX} from 'react';
import {useTableData} from '@/contexts/TableDataContext';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import Filters from './Filters/Filters';
import QueryPreview from './QueryPreview/QueryPreview';
import StatusBar from './StatusBar/StatusBar';

export default function Data(): JSX.Element {
  return <DataContent />;
}

function DataContent(): JSX.Element {
  const selectedTab = useSelectedTab();
  const mounted = useMount();

  const { rows, columns, refreshDataFromServer, getActiveColumns } = useTableData();

  if (!mounted) {
    return <></>;
  }

  return (
    <>
      <ActionBar onRefresh={refreshDataFromServer} />
      {selectedTab?.showFilters && <Filters />}
      {selectedTab?.showSorts && <Sorts />}
      {selectedTab?.showQuery && <QueryPreview />}
      <Box overflow='hidden' flex={1} display='flex' flexDirection='row'>
        {selectedTab?.showColumns && <Columns />}
        {columns.length > 0 && <TestGrid rows={rows} columns={getActiveColumns()} loading={false} />}
      </Box>
      <StatusBar />
    </>
  );
}
