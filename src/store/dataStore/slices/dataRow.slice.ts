import { createEmptyRow } from '@/src/core/utils';
import { RowType } from '@/src/types';
import { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import { DataColumnSlice, DataRowSlice, DataStore } from '../types';

export const createDataRowSlice: StateCreator<DataStore & DataRowSlice & DataColumnSlice, [], [], DataRowSlice> = (
  set,
  get
) => ({
  selectedRow: {},
  rows: {},
  getRows: () => {
    const selectedTab = useTabStore.getState().selectedTab;
    const rows = get().rows;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(rows, selectedTab.id)) {
      return [];
    }
    return rows[selectedTab.id];
  },
  getSelectedRow: (): RowType | undefined => {
    const selectedTab = useTabStore.getState().selectedTab;
    const rows = get().selectedRow;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(rows, selectedTab.id)) {
      return undefined;
    }
    return rows[selectedTab.id];
  },
  updateSelectedRow: (selectedRow: RowType | undefined) => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }

    const rows = get().selectedRow;
    rows[selectedTab.id] = selectedRow;

    set({ selectedRow: rows });
  },
  updateRows: async (items: RowType[]) => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }

    const rows = get().rows;
    rows[selectedTab.id] = items;

    set({ rows });
  },
  addEmptyRow: () => {
    const rows = get().rows;
    const columns = get().getColumns();
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }
    const newRow: RowType = createEmptyRow(columns);
    newRow.dbo_index = rows[selectedTab.id][rows[selectedTab.id].length - 1]!.dbo_index + 1;
    rows[selectedTab.id].push(newRow);

    set({ rows });
  }
});
