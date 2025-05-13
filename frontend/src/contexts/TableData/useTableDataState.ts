import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import type { SelectedRow } from '@/store/dataStore/types';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType, EditedRow, RowType } from '@/types';
import { useState } from 'react';
import type { TableDataState } from './types';

/**
 * Hook for managing the state of the TableData context
 */
export const useTableDataState = (): TableDataState => {
  const { selectedTabId } = useTabStore();
  const [rows, setRows] = useState<RowType[]>([]);
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [editedRows, setEditedRows] = useState<EditedRow[]>([]);
  const [removedRows, setRemovedRows] = useState<RowType[]>([]);
  const [unsavedRows, setUnsavedRows] = useState<RowType[]>([]);
  const [selectedRows, setSelectedRowsState] = useState<SelectedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load data from IndexedDB
   */
  const loadDataFromIndexedDB = async (): Promise<{ rows: RowType[]; columns: ColumnType[] } | null> => {
    if (!selectedTabId) return null;

    setIsLoading(true);
    try {
      // Try to load data from IndexedDB
      const dbRows = await indexedDBService.getRows(selectedTabId);
      const dbColumns = await indexedDBService.getColumns(selectedTabId);
      const dbEditedRows = await indexedDBService.getEditedRows(selectedTabId);
      const dbRemovedRows = await indexedDBService.getRemovedRows(selectedTabId);
      const dbUnsavedRows = await indexedDBService.getUnsavedRows(selectedTabId);
      const dbSelectedRows = await indexedDBService.getSelectedRows(selectedTabId);

      // If we have data in IndexedDB, use it
      if (dbRows.length > 0 && dbColumns.length > 0) {
        setRows(dbRows);
        setColumns(dbColumns);
        setEditedRows(dbEditedRows);
        setRemovedRows(dbRemovedRows);
        setUnsavedRows(dbUnsavedRows);
        setSelectedRowsState(dbSelectedRows);
        return { rows: dbRows, columns: dbColumns };
      }
    } catch (error) {
      console.error('Error loading data from IndexedDB:', error);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  /**
   * Get the current state
   */
  const getState = (): TableDataState => ({
    rows,
    columns,
    editedRows,
    removedRows,
    unsavedRows,
    selectedRows,
    isLoading
  });

  return {
    // State
    rows,
    setRows,
    columns,
    setColumns,
    editedRows,
    setEditedRows,
    removedRows,
    setRemovedRows,
    unsavedRows,
    setUnsavedRows,
    selectedRows,
    setSelectedRowsState,
    isLoading,
    setIsLoading,

    // Methods
    loadDataFromIndexedDB,
    getState
  };
};
