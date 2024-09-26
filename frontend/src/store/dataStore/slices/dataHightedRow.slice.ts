import type { RowType } from '@/types';
import type { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import type { DataHighlightedRowSlice, DataStore } from '../types';

export const createDataHightedRowSlice: StateCreator<
  DataStore & DataHighlightedRowSlice,
  [],
  [],
  DataHighlightedRowSlice
> = (set, get) => ({
  highlightedRow: {},
  getHighlightedRow: (): RowType | undefined => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    const rows = get().highlightedRow;
    return rows[selectedTab?.id as string] ?? undefined;
  },
  updateHighlightedRow: (selectedRow: RowType | undefined) => {
    const selectedTab = useTabStore.getState().getSelectedTab();
    if (!selectedTab) {
      return;
    }

    const rows = get().highlightedRow;
    rows[selectedTab.id] = selectedRow;

    set({ highlightedRow: rows });
  },
  removeHighlightedRowsByTabId: (tabId: string) => {
    const rows = get().highlightedRow;
    if (!rows[tabId]) {
      delete rows[tabId];
    }

    set({ highlightedRow: rows });
  }
});
