import DataGrid from '@/components/common/DataGrid/DataGrid';
import { useTableData } from '@/contexts/TableDataContext';
import { useMount } from '@/hooks';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, CircularProgress } from '@mui/material';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import StatusBar from './StatusBar/StatusBar';

export default function Data(): JSX.Element {
  return <DataContent />;
}

function DataContent(): JSX.Element {
  const mounted = useMount();
  const [isGridReady, setIsGridReady] = useState(false);
  const [showColumns, setShowColumns] = useState(false);

  const { selectedTabId } = useTabStore();
  const { rows, columns, getActiveColumns } = useTableData();

  useEffect(() => {
    setIsGridReady(false);

    const timer = setTimeout(() => {
      setIsGridReady(true);
    }, 100);

    return (): void => clearTimeout(timer);
  }, [selectedTabId]);

  if (!mounted) {
    return <></>;
  }

  return (
    <>
      <ActionBar showColumns={showColumns} setShowColumns={setShowColumns} />
      <Box overflow='hidden' flex={1} display='flex' flexDirection='row'>
        {showColumns && <Columns />}
        {columns.length > 0 &&
          (isGridReady ? (
            <DataGrid rows={rows} columns={getActiveColumns()} loading={false} />
          ) : (
            <Box display='flex' justifyContent='center' alignItems='center' width='100%'>
              <CircularProgress size={30} />
            </Box>
          ))}
      </Box>
      <StatusBar />
    </>
  );
}
