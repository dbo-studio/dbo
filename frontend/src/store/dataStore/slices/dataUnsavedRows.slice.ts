import { createEmptyRow } from '@/core/utils';
import type { RowType, TabType } from '@/types';
import { pullAt } from 'lodash';
import type { StateCreator } from 'zustand';
import type { DataColumnSlice, DataRowSlice, DataStore, DataUnsavedRowsSlice } from '../types';

export const createDataUnsavedRowsSlice: StateCreator<
  DataStore & DataUnsavedRowsSlice & DataRowSlice & DataColumnSlice,
  [],
  [],
  DataUnsavedRowsSlice
> = (set, get) => ({
  unSavedRows: {},
  getUnsavedRows: (tab: TabType | undefined): RowType[] => {
    if (!tab) return [];

    const rows = get().unSavedRows;
    return rows[tab?.id as string] ?? [];
  },
  addUnsavedRows: (tab: TabType, newRow?: RowType): void => {
    const unSavedRows = get().getUnsavedRows(tab);
    if (!newRow) {
      // create an empty row
      const rows = get().getRows(tab);
      const columns = get().getColumns(tab);
      const filteredRow = createEmptyRow(columns);
      filteredRow.dbo_index = rows.length === 0 ? 0 : rows[rows.length - 1].dbo_index + 1;
      rows.push(filteredRow);
      get().updateRows(tab, rows).then();
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
    get().updateUnsavedRows(tab, unSavedRows);
  },
  updateUnsavedRows: (tab: TabType, unSavedRows: RowType[]): void => {
    const rows = get().unSavedRows;
    rows[tab.id] = unSavedRows;
    set({ unSavedRows: rows });
  },
  discardUnsavedRows: (tab: TabType, rows?: RowType[]): void => {
    const unSavedRows = rows ? rows : get().getUnsavedRows(tab);
    if (unSavedRows.length === 0) {
      return;
    }

    const oldRows = get().getRows(tab);
    for (const unSavedRow of unSavedRows) {
      const findValueIndex = oldRows.findIndex((x) => x.dbo_index === unSavedRow.dbo_index);
      pullAt(oldRows, [findValueIndex]);
    }

    get().updateRows(tab, oldRows).then();
    get().updateUnsavedRows(tab, []);
  },
  removeUnsavedRowsByTabId: (tabId: string): void => {
    const rows = get().unSavedRows;
    if (rows[tabId]) {
      delete rows[tabId];
    }

    set({ unSavedRows: rows });
  }
});
