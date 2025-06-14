import { debouncedSaveRemovedRows } from '@/core/utils/indexdbHelper';
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
  updateRemovedRows: (removedRows: RowType[] | undefined): Promise<void> => {
    if (removedRows) {
      set({ removedRows });
      return Promise.resolve();
    }

    const selectedTabId = useTabStore.getState().selectedTabId;
    if (!selectedTabId) return Promise.resolve();

    const selectedRows = get().selectedRows;
    const selectedIndexes = new Set(selectedRows.map((row) => row.index));

    const unsavedRows = get().unSavedRows.filter((r) => selectedIndexes.has(r.dbo_index));
    const unsavedIndexes = new Set(unsavedRows.map((r) => r.dbo_index));

    const rows = get()
      .rows?.filter((r: RowType) => selectedIndexes.has(r.dbo_index) && !unsavedIndexes.has(r.dbo_index))
      .map((row) => (row.id ? { id: row.id, dbo_index: row.dbo_index } : row));

    set({ removedRows: rows });

    get().discardUnsavedRows(unsavedRows);
    get().updateSelectedRows([]);

    debouncedSaveRemovedRows(selectedTabId, rows ?? []);

    return Promise.resolve();
  }
});
