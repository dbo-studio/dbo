import { ConnectionType } from '@/src/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createDatabaseSlice } from './slices/database.slices';
import { ConnectionStore, DatabaseSlice } from './types';

type ConnectionState = ConnectionStore & DatabaseSlice;

export const useConnectionStore = create<ConnectionState>()(
  devtools(
    (set, get, ...state) => ({
      showAddConnection: false,
      showEditConnection: undefined,
      connections: undefined,
      currentConnection: undefined,
      currentSchema: {},
      getCurrentSchema: () => {
        const currentConnection = get().currentConnection;
        const currentSchema = get().currentSchema;
        if (!currentConnection || !Object.prototype.hasOwnProperty.call(currentSchema, currentConnection.id)) {
          return undefined;
        }
        return currentSchema[currentConnection.id];
      },
      updateConnections: (connections: ConnectionType[]) => {
        set({ connections });
      },
      updateShowAddConnection: (show: boolean) => {
        set({ showAddConnection: show });
      },
      updateShowEditConnection: (connection: ConnectionType | undefined) => {
        set({ showEditConnection: connection });
      },
      updateCurrentSchema: (currentSchema: string) => {
        const currentConnection = get().currentConnection;
        if (!currentConnection) {
          return;
        }
        const schemes = get().currentSchema;
        schemes[currentConnection.id] = currentSchema;
        set({ currentSchema: schemes });
      },
      updateCurrentConnection: (currentConnection: ConnectionType) => {
        set({ currentConnection });
      },
      ...createDatabaseSlice(set, get, ...state)
    }),
    { name: 'connections' }
  )
);
