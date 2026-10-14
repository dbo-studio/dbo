import { shortcuts } from '@/core/utils';
import { useShortcut } from './useShortcut';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useCallback, useEffect, useRef } from 'react';
import { useIsMounted } from 'usehooks-ts';

/**
 * Loads the selected data tab's rows (cached in IndexedDB, else from the server), re-runs the query
 * when filters/sorts/pagination toggle `reRunQuery`, and wires the cancel shortcut.
 * Returns whether the grid is still loading.
 */
export function useDataTabLoader(): boolean {
  const isMounted = useIsMounted();
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const reRunQuery = useDataStore((state) => state.reRunQuery);
  const isDataFetching = useDataStore((state) => state.isDataFetching);
  const cancelRunningQuery = useDataStore((state) => state.cancelRunningQuery);
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
    } catch {
      /* ignored */
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
    loadData().catch(() => undefined);
  }, [selectedTabId, isMounted, loadData, cancelRunningQuery]);

  useEffect(() => {
    if (previousReRunQueryRef.current !== reRunQuery) {
      cancelRunningQuery({ silent: true });
      handleReRunQuery().catch(() => undefined);
      previousReRunQueryRef.current = reRunQuery;
    }
  }, [reRunQuery, handleReRunQuery, cancelRunningQuery]);

  return !isMounted || !selectedTabId || isDataFetching;
}
