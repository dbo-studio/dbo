import type { ConnectionType } from '@/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ConnectionStore } from './types';

type ConnectionState = ConnectionStore;

export const useConnectionStore = create<ConnectionState>()(
  devtools(
    (set, get) => ({
      showEditConnection: undefined,
      connections: undefined,
      currentConnection: undefined,
      updateConnections: (connections: ConnectionType[]) => {
        set({ connections });
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
      }
    }),
    { name: 'connections' }
  )
);
