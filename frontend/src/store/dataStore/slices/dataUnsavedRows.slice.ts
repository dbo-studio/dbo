import { createEmptyRow } from '@/core/utils';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { RowType } from '@/types';
import { pullAt } from 'lodash';
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
    const unSavedRows = get().getUnsavedRows();
    if (!newRow) {
      // create an empty row
      const rows = get().getRows();
      const columns = get().getColumns();
      const filteredRow = createEmptyRow(columns);
      filteredRow.dbo_index = rows.length === 0 ? 0 : rows[rows.length - 1].dbo_index + 1;
      rows.push(filteredRow);
      get().updateRows(rows).then();
      //save empty row to unSavedRows
      unSavedRows.push(filteredRow);
    } else {
      const findValueIndex = unSavedRows.findIndex((x) => x.dbo_index === newRow.dbo_index);
      if (findValueIndex === -1) {
        unSavedRows.push(newRow);
      } else {
        unSavedRows[findValueIndex] = { ...unSavedRows[findValueIndex], ...newRow };
      }
    }
    get().updateUnsavedRows(unSavedRows);
  },
  updateUnsavedRows: (unSavedRows: RowType[]): void => {
    const id = tabId();
    if (!id) return;

    const rows = get().unSavedRows;
    rows[id] = unSavedRows;
    set({ unSavedRows: rows });
  },
  discardUnsavedRows: (rows?: RowType[]): void => {
    const unSavedRows = rows ? rows : get().getUnsavedRows();
    if (unSavedRows.length === 0) {
      return;
    }

    const oldRows = get().getRows();
    for (const unSavedRow of unSavedRows) {
      const findValueIndex = oldRows.findIndex((x) => x.dbo_index === unSavedRow.dbo_index);
      pullAt(oldRows, [findValueIndex]);
    }

    get().updateRows(oldRows).then();
    get().updateUnsavedRows([]);
  },
  removeUnsavedRowsByTabId: (tabId: string): void => {
    const rows = get().unSavedRows;
    if (rows[tabId]) {
      delete rows[tabId];
    }

    set({ unSavedRows: rows });
  }
});
