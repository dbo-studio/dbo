import { RowType } from '@/src/types';
import { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import { DataHightedRowSlice, DataStore } from '../types';

export const createDataHightedRowSlice: StateCreator<DataStore & DataHightedRowSlice, [], [], DataHightedRowSlice> = (
  set,
  get
) => ({
  hightedRow: {},
  getHightedRow: (): RowType | undefined => {
    const selectedTab = useTabStore.getState().selectedTab;
    const rows = get().hightedRow;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(rows, selectedTab.id)) {
      return undefined;
    }
    return rows[selectedTab.id];
  },
  updateHightedRow: (selectedRow: RowType | undefined) => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }

    const rows = get().hightedRow;
    rows[selectedTab.id] = selectedRow;

    set({ hightedRow: rows });
  }
});
