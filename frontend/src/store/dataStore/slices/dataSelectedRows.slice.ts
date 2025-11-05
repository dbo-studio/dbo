import { useTabStore } from '@/store/tabStore/tab.store';
import type { StateCreator } from 'zustand';
import type { DataSelectedRowsSlice, DataStore, SelectedRow } from '../types';

export const createDataSelectedRowsSlice: StateCreator<
  DataStore & DataSelectedRowsSlice,
  [['zustand/devtools', never]],
  [],
  DataSelectedRowsSlice
> = (set, get) => ({
  selectedRows: [],
  updateSelectedRows: (rows: SelectedRow[], replace?: boolean): Promise<void> => {
    const selectedTabId = useTabStore.getState().selectedTabId;
    if (!selectedTabId) return Promise.resolve();

    const currentSelectedRows = get().selectedRows;
    let newSelectedRows: SelectedRow[];

    if (replace) {
      if (
        currentSelectedRows.length === rows.length &&
        currentSelectedRows.every(
          (current, index) =>
            current.index === rows[index]?.index &&
            current.selectedColumn === rows[index]?.selectedColumn
        )
      ) {
        return Promise.resolve();
      }
      newSelectedRows = rows;
    } else {
      newSelectedRows = [...currentSelectedRows, ...rows];
    }

    set({ selectedRows: newSelectedRows }, undefined, 'updateSelectedRows');
    return Promise.resolve();
  }
});
