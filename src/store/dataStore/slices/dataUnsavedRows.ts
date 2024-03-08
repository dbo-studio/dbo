import { RowType } from '@/src/types';
import { StateCreator } from 'zustand';
import { useTabStore } from '../../tabStore/tab.store';
import { DataStore, DataUnsavedRowsSlice } from '../types';

export const createDataUnsavedRowsSlice: StateCreator<
  DataStore & DataUnsavedRowsSlice,
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
  updateUnsavedRows: (row: RowType): void => {
    const selectedTab = useTabStore.getState().selectedTab;
    const unSavedRows = get().unSavedRows;
    if (!selectedTab) {
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(unSavedRows, selectedTab.id)) {
      unSavedRows[selectedTab.id] = [row];
    } else {
      unSavedRows[selectedTab.id].push(row);
    }

    set({ unSavedRows });
  },
  discardUnsavedRows: (): void => {
    const selectedTab = useTabStore.getState().selectedTab;
    const unSavedRows = get().unSavedRows;
    if (!selectedTab) {
      return;
    }
    unSavedRows[selectedTab.id] = [];
    set({ unSavedRows });
  }
});
