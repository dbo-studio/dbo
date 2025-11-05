import DataGrid from '@/components/common/DataGrid/DataGrid';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType, RowType } from '@/types';
import { Box, CircularProgress } from '@mui/material';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMounted } from 'usehooks-ts';
import ActionBar from './ActionBar/ActionBar';
import Columns from './ActionBar/Columns/Columns';
import StatusBar from './StatusBar/StatusBar';

const EMPTY_ROWS: RowType[] = [];
const EMPTY_COLUMNS: ColumnType[] = [];

export default function Data(): JSX.Element {
  const isMounted = useIsMounted();

  const [isGridReady, setIsGridReady] = useState(false);
  const [showColumns, setShowColumns] = useState(false);

  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const reRunQuery = useDataStore((state) => state.reRunQuery);

  const rows = useDataStore((state) => state.rows ?? EMPTY_ROWS);
  const allColumns = useDataStore((state) => state.columns ?? EMPTY_COLUMNS);

  const activeColumns = useMemo(() => allColumns.filter((column) => column.isActive), [allColumns]);

  const loadDataFromIndexedDB = useDataStore((state) => state.loadDataFromIndexedDB);
  const runQuery = useDataStore((state) => state.runQuery);

  const previousReRunQueryRef = useRef<boolean>(reRunQuery);
  const currentAbortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const result = await loadDataFromIndexedDB();
      if (!result) {
        const abortController = new AbortController();
        currentAbortControllerRef.current = abortController;

        await runQuery(abortController);
      }
    } catch (error) {
      console.debug('🚀 ~ loadData ~ error:', error);
    }
  }, [loadDataFromIndexedDB, runQuery]);

  const handleReRunQuery = useCallback(async (): Promise<void> => {
    const abortController = new AbortController();
    currentAbortControllerRef.current = abortController;

    await runQuery(abortController);
  }, [runQuery]);

  const cancelCurrentQuery = useCallback(() => {
    if (currentAbortControllerRef.current) {
      currentAbortControllerRef.current.abort();
      currentAbortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setIsGridReady(false);
    if (!isMounted || !selectedTabId) {
      setIsGridReady(true);
      return;
    }

    cancelCurrentQuery();
    loadData().then(() => {
      setIsGridReady(true);
    });
  }, [selectedTabId, isMounted, loadData, cancelCurrentQuery]);

  useEffect(() => {
    if (previousReRunQueryRef.current !== reRunQuery) {
      cancelCurrentQuery();
      setIsGridReady(false);
      handleReRunQuery()
        .then(() => {
          setIsGridReady(true);
        })
        .catch(() => {
          setIsGridReady(true);
        });
      previousReRunQueryRef.current = reRunQuery;
    }
  }, [reRunQuery, handleReRunQuery, cancelCurrentQuery]);

  return (
    <>
      <ActionBar showColumns={showColumns} setShowColumns={setShowColumns} />
      <Box position='relative' overflow='hidden' flex={1} display='flex' flexDirection='row'>
        {showColumns && <Columns />}
        {activeColumns.length > 0 &&
          (isGridReady ? (
            <DataGrid rows={rows} columns={activeColumns} loading={false} />
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
