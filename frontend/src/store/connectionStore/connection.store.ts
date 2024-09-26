import type { ConnectionType } from '@/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createDatabaseSlice } from './slices/database.slices';
import type { ConnectionStore, DatabaseSlice } from './types';

type ConnectionState = ConnectionStore & DatabaseSlice;

export const useConnectionStore = create<ConnectionState>()(
  devtools(
    immer((set, get, ...state) => ({
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
      updateCurrentConnection: (currentConnection: ConnectionType | undefined) => {
        let connections = get().connections;
        if (!connections) {
          return;
        }

        if (!currentConnection) {
          set({ currentConnection: undefined });
          return;
        }

        connections = connections.map((c: ConnectionType) => {
          if (c.id === currentConnection.id) {
            return currentConnection;
          }
          return c;
        });

        set({ currentConnection, connections });
      },
      ...createDatabaseSlice(set, get, ...state)
    })),
    { name: 'connections' }
  )
);
