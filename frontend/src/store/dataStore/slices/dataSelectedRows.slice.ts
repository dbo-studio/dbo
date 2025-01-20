import type { StateCreator } from 'zustand';
import type { DataSelectedRowsSlice, DataStore } from '../types';

export const createDataSelectedRowsSlice: StateCreator<
  DataStore & DataSelectedRowsSlice,
  [],
  [],
  DataSelectedRowsSlice
> = (set, get) => ({
  selectedRows: new Map(),
  toggleClear: true,
  getSelectedRows: () => {
    return Array.from(get().selectedRows.values());
  },
  setSelectedRows: (rows) => {
    const mappedRows = new Map(rows.map((row) => [row.index, row]));
    set({ selectedRows: mappedRows });
  },
  clearSelectedRows: () => {
    set({ selectedRows: new Map(), toggleClear: !get().toggleClear });
  }
});
