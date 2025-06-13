import DataGrid from '@/components/common/DataGrid/DataGrid';
import { useMount } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, CircularProgress } from '@mui/material';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import StatusBar from './StatusBar/StatusBar';

export default function Data(): JSX.Element {
  const mounted = useMount();
  const [isGridReady, setIsGridReady] = useState(false);
  const [showColumns, setShowColumns] = useState(false);

  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const toggleDataFetching = useDataStore((state) => state.toggleDataFetching);
  const rows = useDataStore((state) => state.rows);
  const columns = useDataStore((state) => state.columns);
  const getActiveColumns = useDataStore((state) => state.getActiveColumns);
  const loadDataFromIndexedDB = useDataStore((state) => state.loadDataFromIndexedDB);
  const runQuery = useDataStore((state) => state.runQuery);

  useEffect(() => {
    if (!selectedTabId) return;

    const loadData = async (): Promise<void> => {
      toggleDataFetching(true);
      try {
        const result = await loadDataFromIndexedDB();
        if (!result) {
          await runQuery();
        }
      } catch (error) {
        console.error('🚀 ~ loadData ~ error:', error);
        await useDataStore.getState().runQuery();
      } finally {
        useDataStore.getState().toggleDataFetching(false);
      }
    };

    loadData();
  }, [selectedTabId]);

  useEffect(() => {
    setIsGridReady(false);

    const timer = setTimeout(() => {
      setIsGridReady(true);
    }, 100);

    return (): void => clearTimeout(timer);
  }, [selectedTabId]);

  if (!mounted || !selectedTabId) {
    return <></>;
  }

  return (
    <>
      <ActionBar showColumns={showColumns} setShowColumns={setShowColumns} />
      <Box overflow='hidden' flex={1} display='flex' flexDirection='row'>
        {showColumns && <Columns />}
        {columns &&
          columns.length > 0 &&
          rows &&
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
