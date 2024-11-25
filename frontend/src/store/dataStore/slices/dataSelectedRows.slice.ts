import type { StateCreator } from 'zustand';
import type { DataSelectedRowsSlice, DataStore } from '../types';

export const createDataSelectedRowsSlice: StateCreator<
  DataStore & DataSelectedRowsSlice,
  [],
  [],
  DataSelectedRowsSlice
> = (set, get) => ({
  selectedRows: new Set<number>(),

  getSelectedRows: () => {
    return Array.from(get().selectedRows);
  },

  setSelectedRows: (rows) => {
    set({ selectedRows: new Set(rows) });
  }
});
