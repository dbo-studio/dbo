import { createEmptyRow } from '@/core/utils';
import { debouncedSaveUnsavedRows } from '@/core/utils/indexdbHelper';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { RowType } from '@/types';
import type { StateCreator } from 'zustand';
import type { DataColumnSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';

export const createDataUnsavedRowsSlice: StateCreator<
  DataStore & DataUnsavedRowsSlice & DataRowSlice & DataColumnSlice,
  [],
  [],
  DataUnsavedRowsSlice
> = (set, get) => ({
  unSavedRows: [],
  addUnsavedRows: (newRow?: RowType): void => {
    let unSavedRows = get().unSavedRows;
    if (!newRow) {
      // create an empty row
      const rows = get().rows ?? [];
      const columns = get().columns ?? [];
      const filteredRow = createEmptyRow(columns);
      filteredRow.dbo_index = rows.length === 0 ? 0 : rows[rows.length - 1].dbo_index + 1;
      const newRows = [...rows, filteredRow];
      get().updateRows(newRows).then();
      //save empty row to unSavedRows
      unSavedRows = [...unSavedRows, filteredRow];
    } else {
      const findValueIndex = unSavedRows.findIndex((x) => x.dbo_index === newRow.dbo_index);
      if (findValueIndex === -1) {
        unSavedRows = [...unSavedRows, newRow];
      } else {
        unSavedRows = unSavedRows.map((row, idx) => (idx === findValueIndex ? { ...row, ...newRow } : row));
      }
    }
    get().updateUnsavedRows(unSavedRows);
  },
  updateUnsavedRows: (unSavedRows: RowType[]): Promise<void> => {
    const selectedTabId = useTabStore.getState().selectedTabId;
    if (!selectedTabId) return Promise.resolve();

    set({ unSavedRows });

    debouncedSaveUnsavedRows(selectedTabId, unSavedRows);
    return Promise.resolve();
  },
  discardUnsavedRows: async (rows?: RowType[]): Promise<void> => {
    const unSavedRows = rows ?? get().unSavedRows;
    if (unSavedRows.length === 0) return;

    const unsavedIndexes = new Set(unSavedRows.map((row) => row.dbo_index));
    const updatedRows = get().rows?.filter((row) => !unsavedIndexes.has(row.dbo_index));
    if (!updatedRows) return;

    await get().updateRows(updatedRows);
    get().updateUnsavedRows([]);
  }
});
