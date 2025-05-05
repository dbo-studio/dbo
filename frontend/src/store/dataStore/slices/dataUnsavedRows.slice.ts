import { createEmptyRow } from '@/core/utils';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { RowType } from '@/types';
import type { StateCreator } from 'zustand';
import type { DataColumnSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';

const tabId = (): string | undefined => {
  return useTabStore.getState().selectedTabId;
};

export const createDataUnsavedRowsSlice: StateCreator<
  DataStore & DataUnsavedRowsSlice & DataRowSlice & DataColumnSlice,
  [],
  [],
  DataUnsavedRowsSlice
> = (set, get) => ({
  unSavedRows: {},
  getUnsavedRows: (): RowType[] => {
    const id = tabId();
    if (!id) return [];

    const rows = get().unSavedRows;
    return rows[id] ?? [];
  },
  addUnsavedRows: (newRow?: RowType): void => {
    let unSavedRows = get().getUnsavedRows();
    if (!newRow) {
      // create an empty row
      const rows = get().getRows();
      const columns = get().getColumns();
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
  updateUnsavedRows: (unSavedRows: RowType[]): void => {
    const id = tabId();
    if (!id) return;

    set((state) => ({
      unSavedRows: {
        ...state.unSavedRows,
        [id]: unSavedRows
      }
    }));
  },
  discardUnsavedRows: async (rows?: RowType[]): Promise<void> => {
    const unSavedRows = rows ?? get().getUnsavedRows();
    if (unSavedRows.length === 0) return;

    const unsavedIndexes = new Set(unSavedRows.map((row) => row.dbo_index));
    const updatedRows = get()
      .getRows()
      .filter((row) => !unsavedIndexes.has(row.dbo_index));

    await get().updateRows(updatedRows);
    get().updateUnsavedRows([]);
  },
  removeUnsavedRowsByTabId: (tabId: string): void => {
    set((state) => ({
      unSavedRows: Object.fromEntries(Object.entries(state.unSavedRows).filter(([key]) => key !== tabId))
    }));
  }
});
