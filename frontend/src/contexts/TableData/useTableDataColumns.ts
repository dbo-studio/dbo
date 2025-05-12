import { useCallback } from 'react';
import { useTabStore } from '@/store/tabStore/tab.store';
import { indexedDBService } from '@/services/indexedDB/indexedDB.service';
import type { ColumnType } from '@/types';

/**
 * Hook for handling column operations in the TableData context
 */
export const useTableDataColumns = (state: {
  columns: ColumnType[];
  setColumns: (columns: ColumnType[]) => void;
}) => {
  const { selectedTabId } = useTabStore();
  const { columns, setColumns } = state;

  /**
   * Update columns
   */
  const updateColumns = useCallback(async (newColumns: ColumnType[]): Promise<void> => {
    if (!selectedTabId) return;

    setColumns(newColumns);
    // Save to IndexedDB
    await indexedDBService.saveColumns(selectedTabId, newColumns);
  }, [selectedTabId, setColumns]);

  /**
   * Get active columns (columns with isActive=true)
   */
  const getActiveColumns = useCallback((): ColumnType[] => {
    return columns.filter(c => c.isActive);
  }, [columns]);

  return {
    columns,
    updateColumns,
    getActiveColumns
  };
};