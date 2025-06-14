import DataGrid from '@/components/common/DataGrid/DataGrid';
import { useMount } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType, RowType } from '@/types';
import { Box, CircularProgress } from '@mui/material';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import ActionBar from './ActionBar/ActionBar';
import Columns from './Columns/Columns';
import StatusBar from './StatusBar/StatusBar';

export default function Data(): JSX.Element {
  const mounted = useMount();
  const [tableData, setTableData] = useState({
    rows: [] as RowType[],
    columns: [] as ColumnType[]
  });
  const [isGridReady, setIsGridReady] = useState(false);
  const [showColumns, setShowColumns] = useState(false);

  const selectedTabId = useTabStore((state) => state.selectedTabId);

  const toggleDataFetching = useDataStore((state) => state.toggleDataFetching);
  const loadDataFromIndexedDB = useDataStore((state) => state.loadDataFromIndexedDB);
  const runQuery = useDataStore((state) => state.runQuery);

  const loadData = async (): Promise<void> => {
    setTableData({
      rows: [],
      columns: []
    });

    toggleDataFetching(true);
    try {
      const result = await loadDataFromIndexedDB();
      if (!result) {
        const res = await runQuery();
        setTableData({
          rows: res?.data ?? [],
          columns: res?.columns.filter((column) => column.isActive) ?? []
        });
      } else {
        setTableData(result);
      }
    } catch (error) {
      console.error('🚀 ~ loadData ~ error:', error);
      await useDataStore.getState().runQuery();
    } finally {
      useDataStore.getState().toggleDataFetching(false);
    }
  };

  useEffect(() => {
    setIsGridReady(false);

    const timer = setTimeout(() => {
      loadData();
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
