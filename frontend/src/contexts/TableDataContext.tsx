import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TableDataContextType, TableDataProviderProps } from './TableData/types';
import { useTableDataState } from './TableData/useTableDataState';
import { useTableDataQuery } from './TableData/useTableDataQuery';
import { useTableDataRows } from './TableData/useTableDataRows';
import { useTableDataColumns } from './TableData/useTableDataColumns';
import { useTableDataEdited } from './TableData/useTableDataEdited';
import { useTableDataRemoved } from './TableData/useTableDataRemoved';
import { useTableDataUnsaved } from './TableData/useTableDataUnsaved';
import { useTableDataSelected } from './TableData/useTableDataSelected';

// Create the context with a default value
const TableDataContext = createContext<TableDataContextType | undefined>(undefined);

// Provider component
export function TableDataProvider({ children }: TableDataProviderProps) {
  const { selectedTabId } = useTabStore();

  // Initialize state
  const state = useTableDataState();

  // Initialize hooks for different operations
  const queryOperations = useTableDataQuery(state);
  const rowOperations = useTableDataRows(state);
  const columnOperations = useTableDataColumns(state);
  const editedOperations = useTableDataEdited(state);
  const removedOperations = useTableDataRemoved(state);
  const unsavedOperations = useTableDataUnsaved(state);
  const selectedOperations = useTableDataSelected(state);

  // Load data when tab changes
  useEffect(() => {
    if (!selectedTabId) return;

    const loadData = async () => {
      state.setIsLoading(true);
      try {
        // Try to load data from IndexedDB
        const result = await state.loadDataFromIndexedDB();

        // If no data in IndexedDB, fetch from server
        if (!result) {
          await queryOperations.fetchDataFromServer();
        }
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to fetching from server
        await queryOperations.fetchDataFromServer();
      } finally {
        state.setIsLoading(false);
      }
    };

    loadData();
  }, [selectedTabId]);


  // Create the context value with memoization to prevent unnecessary re-renders
  const contextValue = useMemo<TableDataContextType>(() => ({
    // Data access
    rows: state.rows,
    columns: state.columns,
    editedRows: state.editedRows,
    removedRows: state.removedRows,
    unsavedRows: state.unsavedRows,
    selectedRows: state.selectedRows,
    isLoading: state.isLoading,

    // Row operations
    ...rowOperations,

    // Column operations
    ...columnOperations,

    // Edited rows operations
    ...editedOperations,

    // Removed rows operations
    ...removedOperations,

    // Unsaved rows operations
    ...unsavedOperations,

    // Selected rows operations
    ...selectedOperations,

    // Query operations
    ...queryOperations
  }), [
    // State dependencies
    state.rows,
    state.columns,
    state.editedRows,
    state.removedRows,
    state.unsavedRows,
    state.selectedRows,
    state.isLoading,

    // Operation dependencies
    rowOperations,
    columnOperations,
    editedOperations,
    removedOperations,
    unsavedOperations,
    selectedOperations,
    queryOperations
  ]);

  return (
    <TableDataContext.Provider value={contextValue}>
      {children}
    </TableDataContext.Provider>
  );
}

// Custom hook to use the context
export function useTableData() {
  const context = useContext(TableDataContext);
  if (context === undefined) {
    throw new Error('useTableData must be used within a TableDataProvider');
  }
  return context;
}
