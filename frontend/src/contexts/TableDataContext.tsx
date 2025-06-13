import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { type JSX, createContext, useContext, useEffect, useMemo } from 'react';
import type { TableDataContextType, TableDataProviderProps } from './TableData/types';
import { useTableDataColumns } from './TableData/useTableDataColumns';
import { useTableDataEdited } from './TableData/useTableDataEdited';
import { useTableDataRemoved } from './TableData/useTableDataRemoved';
import { useTableDataSelected } from './TableData/useTableDataSelected';
import { useTableDataUnsaved } from './TableData/useTableDataUnsaved';

const TableDataContext = createContext<TableDataContextType | undefined>(undefined);

export function TableDataProvider({ children }: TableDataProviderProps): JSX.Element {
  const selectedTabId = useTabStore((state) => state.selectedTabId);

  const columnOperations = useTableDataColumns();
  const editedOperations = useTableDataEdited();
  const removedOperations = useTableDataRemoved();
  const unsavedOperations = useTableDataUnsaved();
  const selectedOperations = useTableDataSelected();

  // Load data when tab changes
  useEffect(() => {
    if (!selectedTabId) return;

    const loadData = async (): Promise<void> => {
      useDataStore.getState().toggleDataFetching(true);
      try {
        const result = await useDataStore.getState().loadDataFromIndexedDB();
        if (!result) {
          await useDataStore.getState().runQuery();
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

  const contextValue = useMemo<TableDataContextType>(
    () => ({
      ...columnOperations,
      ...editedOperations,
      ...removedOperations,
      ...unsavedOperations,
      ...selectedOperations
    }),
    [columnOperations, editedOperations, removedOperations, unsavedOperations, selectedOperations]
  );

  return <TableDataContext.Provider value={contextValue}>{children}</TableDataContext.Provider>;
}

// Custom hook to use the context
export function useTableData(): TableDataContextType {
  const context = useContext(TableDataContext);
  if (context === undefined) {
    throw new Error('useTableData must be used within a TableDataProvider');
  }
  return context;
}
