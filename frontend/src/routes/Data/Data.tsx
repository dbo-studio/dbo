import DataGrid from '@/components/common/DataGrid/DataGrid';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import { useSelectedTab } from '@/hooks';
import { useShortcut } from '@/hooks';
import { shortcuts } from '@/core/utils';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType, DataTabType, RowType } from '@/types';
import { CircularProgress } from '@mui/material';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMounted } from 'usehooks-ts';
import ActionBar from './ActionBar/ActionBar';
import Columns from './ActionBar/Columns/Columns';
import { DataContentStyled, DataLoadingStyled } from './Data.styled';
import StatusBar from './StatusBar/StatusBar';

const EMPTY_ROWS: RowType[] = [];
const EMPTY_COLUMNS: ColumnType[] = [];

export default function Data(): JSX.Element {
  const isMounted = useIsMounted();
  const selectedTab = useSelectedTab<DataTabType>();

  const [showColumns, setShowColumns] = useState(false);

  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const reRunQuery = useDataStore((state) => state.reRunQuery);
  const isDataFetching = useDataStore((state) => state.isDataFetching);
  const cancelRunningQuery = useDataStore((state) => state.cancelRunningQuery);

  const rows = useDataStore((state) => state.rows ?? EMPTY_ROWS);
  const allColumns = useDataStore((state) => state.columns ?? EMPTY_COLUMNS);

  const activeColumns = useMemo(() => allColumns.filter((column) => column.isActive), [allColumns]);

  const loadDataFromIndexedDB = useDataStore((state) => state.loadDataFromIndexedDB);
  const runQuery = useDataStore((state) => state.runQuery);

  const previousReRunQueryRef = useRef<boolean>(reRunQuery);

  useShortcut(shortcuts.cancelQuery, () => {
    if (isDataFetching) {
      cancelRunningQuery();
    }
  });

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const result = await loadDataFromIndexedDB();
      if (!result) {
        await runQuery();
      }
    } catch (error) {
      console.debug('🚀 ~ loadData ~ error:', error);
    }
  }, [loadDataFromIndexedDB, runQuery]);

  const handleReRunQuery = useCallback(async (): Promise<void> => {
    await runQuery();
  }, [runQuery]);

  useEffect(() => {
    if (!isMounted || !selectedTabId) {
      return;
    }

    cancelRunningQuery({ silent: true });
    loadData().catch((e) => console.debug('🚀 ~ Data ~ e:', e));
  }, [selectedTabId, isMounted, loadData, cancelRunningQuery]);

  useEffect(() => {
    if (previousReRunQueryRef.current !== reRunQuery) {
      cancelRunningQuery({ silent: true });
      handleReRunQuery().catch(() => undefined);
      previousReRunQueryRef.current = reRunQuery;
    }
  }, [reRunQuery, handleReRunQuery, cancelRunningQuery]);

  const isGridLoading = !isMounted || !selectedTabId || isDataFetching;

  return (
    <>
      <ActionBar showColumns={showColumns} setShowColumns={setShowColumns} />
      <DataContentStyled>
        {showColumns && <Columns />}
        {activeColumns.length > 0 ? (
          <DataGrid rows={rows} columns={activeColumns} loading={isGridLoading} editable={selectedTab?.editable} />
        ) : isGridLoading ? (
          <DataLoadingStyled>
            <CircularProgress size={30} />
          </DataLoadingStyled>
        ) : (
          <EmptyState icon='grid' title={locales.data_empty_title} description={locales.data_empty_description} />
        )}
      </DataContentStyled>
      <StatusBar />
    </>
  );
}
