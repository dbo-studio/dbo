import type { StateCreator } from 'zustand';
import type { DataSelectedRowsSlice, DataStore, SelectedRow } from '../types';

export const createDataSelectedRowsSlice: StateCreator<
  DataStore & DataSelectedRowsSlice,
  [],
  [],
  DataSelectedRowsSlice
> = (set, get) => ({
  selectedRows: new Map(),
  toggleClear: true,
  getSelectedRows: (): SelectedRow[] => {
    return Array.from(get().selectedRows.values());
  },
  setSelectedRows: (rows: SelectedRow[]): void => {
    const mappedRows = new Map(rows.map((row) => [row.index, row]));
    set({ selectedRows: mappedRows });
  },
  clearSelectedRows: (): void => {
    set({ selectedRows: new Map(), toggleClear: !get().toggleClear });
  }
});
