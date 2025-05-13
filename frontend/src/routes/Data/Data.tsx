import TestGrid from '@/components/common/DBDataGrid/TestGrid/TestGrid';
import { useMount } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import Sorts from '@/routes/Data/Sorts/Sorts.tsx';
import { Box, CircularProgress } from '@mui/material';
import type { JSX } from 'react';
import { useTableData } from '@/contexts/TableDataContext';
import { useEffect, useState } from 'react';
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
  const [isGridReady, setIsGridReady] = useState(false);

  const { rows, columns, refreshDataFromServer, getActiveColumns } = useTableData();

  // Reset grid ready state when selected tab changes
  useEffect(() => {
    setIsGridReady(false);

    // Delay rendering the TestGrid to allow the page to load first
    const timer = setTimeout(() => {
      setIsGridReady(true);
    }, 100); // Small delay to ensure the page renders first

    return () => clearTimeout(timer);
  }, [selectedTab?.id]); // Reset when tab changes

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
        {columns.length > 0 && (
          isGridReady ? (
            <TestGrid rows={rows} columns={getActiveColumns()} loading={false} />
          ) : (
            <Box display='flex' justifyContent='center' alignItems='center' width='100%'>
              <CircularProgress size={30} />
            </Box>
          )
        )}
      </Box>
      <StatusBar />
    </>
  );
}
