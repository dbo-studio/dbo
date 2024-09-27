import type { StateCreator } from 'zustand';
import type { ConnectionStore, DatabaseSlice } from '../types';

export const createDatabaseSlice: StateCreator<ConnectionStore & DatabaseSlice, [], [], DatabaseSlice> = (set) => ({
  showSelectDatabase: false,
  updateShowSelectDatabase: (show: boolean) => {
    set({ showSelectDatabase: show });
  }
});
