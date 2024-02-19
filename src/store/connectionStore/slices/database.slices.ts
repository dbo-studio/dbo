import { StateCreator } from 'zustand';
import { ConnectionStore, DatabaseSlice } from '../types';

export const createDatabaseSlice: StateCreator<ConnectionStore & DatabaseSlice, [], [], DatabaseSlice> = (
  set,
  get
) => ({
  showSelectDatabase: false,
  currentDatabase: {},
  updateShowSelectDatabase: (show: boolean) => {
    set({ showSelectDatabase: show });
  },
  getCurrentDatabase: () => {
    const currentConnection = get().currentConnection;
    const currentDatabase = get().currentDatabase;
    if (!currentConnection || !Object.prototype.hasOwnProperty.call(currentDatabase, currentConnection.id)) {
      return undefined;
    }
    return currentDatabase[currentConnection.id];
  },
  updateCurrentDatabase: (database: string) => {
    const currentConnection = get().currentConnection;
    if (!currentConnection) {
      return;
    }
    const databases = get().currentDatabase;
    databases[currentConnection.id] = database;
    set({ currentDatabase: databases });
  }
});
