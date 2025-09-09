import DataGrid from '@/components/common/DataGrid/DataGrid';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType, RowType } from '@/types';
import { Box, CircularProgress } from '@mui/material';
import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsMounted } from 'usehooks-ts';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import StatusBar from './StatusBar/StatusBar';

export default function Data(): JSX.Element {
  const isMounted = useIsMounted();

  const [tableData, setTableData] = useState({
    rows: [] as RowType[],
    columns: [] as ColumnType[]
  });
  const [isGridReady, setIsGridReady] = useState(false);
  const [showColumns, setShowColumns] = useState(false);

  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const reRunQuery = useDataStore((state) => state.reRunQuery);
  const reRender = useDataStore((state) => state.reRender);
  const loadDataFromIndexedDB = useDataStore((state) => state.loadDataFromIndexedDB);
  const runQuery = useDataStore((state) => state.runQuery);

  const previousReRunQueryRef = useRef<boolean>(reRunQuery);
  const previousReRenderRef = useRef<boolean>(reRender);
  const currentAbortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (): Promise<void> => {
    setTableData({ rows: [], columns: [] });

    try {
      const result = await loadDataFromIndexedDB();
      if (!result) {
        const abortController = new AbortController();
        currentAbortControllerRef.current = abortController;

        const res = await runQuery(abortController);
        if (res && !abortController.signal.aborted) {
          setTableData({
            rows: res?.data ?? [],
            columns: res?.columns.filter((column) => column.isActive) ?? []
          });
        }
      } else {
        setTableData(result);
      }
    } catch (error) {
      console.debug('🚀 ~ loadData ~ error:', error);
    }
  }, [loadDataFromIndexedDB, runQuery]);

  const handleReRunQuery = useCallback(async (): Promise<void> => {
    const abortController = new AbortController();
    currentAbortControllerRef.current = abortController;

    const res = await runQuery(abortController);
    setTableData({
      rows: res?.data ?? [],
      columns: res?.columns.filter((column) => column.isActive) ?? []
    });
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
      handleReRunQuery();
      previousReRunQueryRef.current = reRunQuery;
    }
  }, [reRunQuery, handleReRunQuery, cancelCurrentQuery]);

  useEffect(() => {
    if (previousReRenderRef.current !== reRender) {
      setTableData({
        rows: useDataStore.getState().rows ?? [],
        columns: useDataStore.getState().columns ?? []
      });
      previousReRenderRef.current = reRender;
    }
  }, [reRender]);

  return (
    <>
      <ActionBar showColumns={showColumns} setShowColumns={setShowColumns} />
      <Box overflow='hidden' flex={1} display='flex' flexDirection='row'>
        {showColumns && <Columns />}
        {tableData.columns.length > 0 &&
          (isGridReady ? (
            <DataGrid rows={tableData.rows} columns={tableData.columns} loading={false} />
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
