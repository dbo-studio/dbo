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
      updateConnections: (connections: ConnectionType[]) => {
        set({ connections });
      },
      updateShowAddConnection: (show: boolean) => {
        set({ showAddConnection: show });
      },
      updateShowEditConnection: (connection: ConnectionType | undefined) => {
        set({ showEditConnection: connection });
      },
      updateCurrentConnection: (currentConnection: ConnectionType) => {
        const connections = get().connections;
        if (!connections) {
          return;
        }

        connections.map((c: ConnectionType) => {
          if (c.id == currentConnection.id) {
            return currentConnection;
          }
          return c;
        });

        set({ currentConnection, connections });
      },
      ...createDatabaseSlice(set, get, ...state)
    }),
    { name: 'connections' }
  )
);
