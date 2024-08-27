import { RowType } from '@/types';
import { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import { DataHighlightedRowSlice, DataStore } from '../types';

export const createDataHightedRowSlice: StateCreator<
  DataStore & DataHighlightedRowSlice,
  [],
  [],
  DataHighlightedRowSlice
> = (set, get) => ({
  highlightedRow: {},
  getHighlightedRow: (): RowType | undefined => {
    const selectedTab = useTabStore.getState().selectedTab;
    const rows = get().highlightedRow;
    if (!selectedTab || !Object.prototype.hasOwnProperty.call(rows, selectedTab.id)) {
      return undefined;
    }
    return rows[selectedTab.id];
  },
  updateHighlightedRow: (selectedRow: RowType | undefined) => {
    const selectedTab = useTabStore.getState().selectedTab;
    if (!selectedTab) {
      return;
    }

    const rows = get().highlightedRow;
    rows[selectedTab.id] = selectedRow;

    set({ highlightedRow: rows });
  },
  removeHighlightedRowsByTabId: (tabId: string) => {
    const rows = get().highlightedRow;
    if (Object.prototype.hasOwnProperty.call(rows, tabId)) {
      delete rows[tabId];
    }

    set({ highlightedRow: rows });
  }
});
