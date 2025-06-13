import type { StateCreator } from 'zustand';
import type { DataSelectedRowsSlice, DataStore, SelectedRow } from '../types';

export const createDataSelectedRowsSlice: StateCreator<
  DataStore & DataSelectedRowsSlice,
  [],
  [],
  DataSelectedRowsSlice
> = (set) => ({
  selectedRows: [],
  updateSelectedRows: (rows: SelectedRow[]): void => {
    set({ selectedRows: rows });
  }
});
