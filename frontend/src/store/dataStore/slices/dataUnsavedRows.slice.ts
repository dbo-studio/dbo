import { createEmptyRow } from '@/core/utils';
import type { RowType } from '@/types';
import { pullAt } from 'lodash';
import type { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import type { DataColumnSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';
export const createDataUnsavedRowsSlice: StateCreator<
  DataStore & DataUnsavedRowsSlice & DataRowSlice & DataColumnSlice,
  [],
  [],
  DataUnsavedRowsSlice
> = (set, get) => ({
  unSavedRows: {},
  getUnsavedRows: (): RowType[] => {
    const selectedTab = useTabStore.getState().selectedTab;
    const rows = get().unSavedRows;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(rows, selectedTab.id)) {
      return [];
    }
    return rows[selectedTab.id];
  },
  addUnsavedRows: (newRow?: RowType): void => {
    const unSavedRows = get().getUnsavedRows();
    if (!newRow) {
      // create an empty row
      const rows = get().getRows();
      const columns = get().getColumns();
      // biome-ignore lint: reason
      newRow = createEmptyRow(columns);
      newRow.dbo_index = rows.length === 0 ? 0 : rows[rows.length - 1].dbo_index + 1;
      rows.push(newRow);
      get().updateRows(rows);
      //save empty row to unSavedRows
      unSavedRows.push(newRow);
    } else {
      const findValueIndex = unSavedRows.findIndex((x) => x.dbo_index === newRow.dbo_index);
      if (findValueIndex === -1) {
        unSavedRows.push(newRow);
      } else {
        unSavedRows[findValueIndex] = newRow;
      }
    }
    get().updateUnsavedRows(unSavedRows);
  },
  updateUnsavedRows: (unSavedRows: RowType[]): void => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }
    const rows = get().unSavedRows;
    rows[selectedTab.id] = unSavedRows;
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

    get().updateRows(oldRows);
    get().updateUnsavedRows([]);
  },
  removeUnsavedRowsByTabId: (tabId: string) => {
    const rows = get().unSavedRows;
    if (Object.prototype.hasOwnProperty.call(rows, tabId)) {
      delete rows[tabId];
    }

    set({ unSavedRows: rows });
  }
});
