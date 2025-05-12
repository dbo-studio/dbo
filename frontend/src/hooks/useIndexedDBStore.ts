import { useEffect, useCallback } from 'react';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { indexedDBService } from '@/services/indexedDB/indexedDB.service';
import type { RowType, ColumnType } from '@/types';
import type { EditedRow } from '@/types';
import type { SelectedRow } from '@/store/dataStore/types';

/**
 * Hook to manage data persistence with IndexedDB
 * This hook syncs data between the Zustand store and IndexedDB
 * and handles loading data when switching tabs
 */
export const useIndexedDBStore = () => {
  const {
    getRows,
    updateRows,
    getColumns,
    updateColumns,
    getEditedRows,
    updateEditedRows,
    getRemovedRows,
    updateRemovedRows,
    getUnsavedRows,
    updateUnsavedRows,
    getSelectedRows,
    setSelectedRows,
    runQuery,
    isDataFetching,
    toggleDataFetching
  } = useDataStore();

  const { selectedTabId } = useTabStore();

  // Load data from IndexedDB when tab changes
  useEffect(() => {
    if (!selectedTabId) return;

    const loadDataFromIndexedDB = async () => {
      try {
        toggleDataFetching(true);

        // Try to load data from IndexedDB
        const rows = await indexedDBService.getRows(selectedTabId);
        const columns = await indexedDBService.getColumns(selectedTabId);
        const editedRows = await indexedDBService.getEditedRows(selectedTabId);
        const removedRows = await indexedDBService.getRemovedRows(selectedTabId);
        const unsavedRows = await indexedDBService.getUnsavedRows(selectedTabId);
        const selectedRows = await indexedDBService.getSelectedRows(selectedTabId);

        // If we have rows and columns in IndexedDB, use them
        if (rows.length > 0 && columns.length > 0) {
          await updateRows(rows);
          await updateColumns(columns);
          updateEditedRows(editedRows);
          updateRemovedRows(removedRows);
          updateUnsavedRows(unsavedRows);
          setSelectedRows(selectedRows);
        } else {
          // Otherwise, fetch data from the server
          const result = await runQuery();
          if (result) {
            // Save the fetched data to IndexedDB
            await indexedDBService.saveRows(selectedTabId, result.data);
            await indexedDBService.saveColumns(selectedTabId, result.columns);
          }
        }
      } catch (error) {
        console.error('Error loading data from IndexedDB:', error);
        // Fallback to fetching from server
        await runQuery();
      } finally {
        toggleDataFetching(false);
      }
    };

    loadDataFromIndexedDB();
  }, [selectedTabId]);

  // Sync rows to IndexedDB when they change
  useEffect(() => {
    if (!selectedTabId) return;

    const syncRowsToIndexedDB = async () => {
      const rows = getRows();
      if (rows.length > 0) {
        await indexedDBService.saveRows(selectedTabId, rows);
      }
    };

    syncRowsToIndexedDB();
  }, [getRows, selectedTabId]);

  // Sync columns to IndexedDB when they change
  useEffect(() => {
    if (!selectedTabId) return;

    const syncColumnsToIndexedDB = async () => {
      const columns = getColumns();
      if (columns.length > 0) {
        await indexedDBService.saveColumns(selectedTabId, columns);
      }
    };

    syncColumnsToIndexedDB();
  }, [getColumns, selectedTabId]);

  // Sync edited rows to IndexedDB when they change
  useEffect(() => {
    if (!selectedTabId) return;

    const syncEditedRowsToIndexedDB = async () => {
      const editedRows = getEditedRows();
      await indexedDBService.saveEditedRows(selectedTabId, editedRows);
    };

    syncEditedRowsToIndexedDB();
  }, [getEditedRows, selectedTabId]);

  // Sync removed rows to IndexedDB when they change
  useEffect(() => {
    if (!selectedTabId) return;

    const syncRemovedRowsToIndexedDB = async () => {
      const removedRows = getRemovedRows();
      await indexedDBService.saveRemovedRows(selectedTabId, removedRows);
    };

    syncRemovedRowsToIndexedDB();
  }, [getRemovedRows, selectedTabId]);

  // Sync unsaved rows to IndexedDB when they change
  useEffect(() => {
    if (!selectedTabId) return;

    const syncUnsavedRowsToIndexedDB = async () => {
      const unsavedRows = getUnsavedRows();
      await indexedDBService.saveUnsavedRows(selectedTabId, unsavedRows);
    };

    syncUnsavedRowsToIndexedDB();
  }, [getUnsavedRows, selectedTabId]);

  // Sync selected rows to IndexedDB when they change
  useEffect(() => {
    if (!selectedTabId) return;

    const syncSelectedRowsToIndexedDB = async () => {
      const selectedRows = getSelectedRows();
      await indexedDBService.saveSelectedRows(selectedTabId, selectedRows);
    };

    syncSelectedRowsToIndexedDB();
  }, [getSelectedRows, selectedTabId]);

  // Function to clear data for a tab
  const clearTabData = useCallback(async (tabId: string) => {
    await indexedDBService.clearTabData(tabId);
  }, []);

  // Function to force refresh data from server
  const refreshDataFromServer = useCallback(async () => {
    if (!selectedTabId) return;

    try {
      toggleDataFetching(true);
      const result = await runQuery();
      if (result) {
        // Save the fetched data to IndexedDB
        await indexedDBService.saveRows(selectedTabId, result.data);
        await indexedDBService.saveColumns(selectedTabId, result.columns);
      }
    } catch (error) {
      console.error('Error refreshing data from server:', error);
    } finally {
      toggleDataFetching(false);
    }
  }, [selectedTabId, runQuery, toggleDataFetching]);

  return {
    clearTabData,
    refreshDataFromServer,
    isLoading: isDataFetching
  };
};