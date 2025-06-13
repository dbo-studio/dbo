import type { RowType } from '@/types';
import type { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import type {
  DataRemovedRowsSlice,
  DataRowSlice,
  DataSelectedRowsSlice,
  DataStore,
  DataUnsavedRowsSlice
} from '../types';

export const createDataRemovedRowsSlice: StateCreator<
  DataStore & DataRemovedRowsSlice & DataRowSlice & DataUnsavedRowsSlice & DataSelectedRowsSlice,
  [],
  [],
  DataRemovedRowsSlice
> = (set, get) => ({
  removedRows: [],
  updateRemovedRows: (removedRows: RowType[] | undefined): void => {
    if (removedRows) {
      set({ removedRows });
      return;
    }

    const selectedTabId = useTabStore.getState().selectedTabId;
    if (!selectedTabId) return;

    const selectedRows = get().selectedRows;
    const selectedIndexes = new Set(selectedRows.map((row) => row.index));

    const unsavedRows = get().unSavedRows.filter((r) => selectedIndexes.has(r.dbo_index));
    const unsavedIndexes = new Set(unsavedRows.map((r) => r.dbo_index));

    const rows = get()
      .rows?.filter((r: RowType) => selectedIndexes.has(r.dbo_index) && !unsavedIndexes.has(r.dbo_index))
      .map((row) => (row.id ? { id: row.id, dbo_index: row.dbo_index } : row));

    set((state) => ({
      removedRows: {
        ...state.removedRows,
        [selectedTabId]: rows
      }
    }));

    get().discardUnsavedRows(unsavedRows);
    get().updateSelectedRows([]);
  }
});
