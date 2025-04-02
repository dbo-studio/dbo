import type { ConnectionType } from '@/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ConnectionStore, LoadingType } from './types';

type ConnectionState = ConnectionStore;

export const useConnectionStore = create<ConnectionState>()(
  devtools(
    (set, get) => ({
      loading: 'finished',
      connections: undefined,
      updateLoading: (loading: LoadingType) => {
        set({ loading });
      },
      updateConnections: (connections: ConnectionType[]) => {
        set({ connections });
      },
      updateCurrentConnection: (currentConnection: ConnectionType | undefined) => {
        if (!currentConnection) return;

        let connections = get().connections;
        if (!connections) return;

        connections = connections.map((c: ConnectionType) => {
          if (c.id === currentConnection.id) {
            return currentConnection;
          }
          return c;
        });

        set({ connections });
      }
    }),
    { name: 'connections' }
  )
);
