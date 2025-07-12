import type { ConnectionType } from '@/types';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ConnectionStore, LoadingType } from './types';

type ConnectionState = ConnectionStore;

export const useConnectionStore: UseBoundStore<StoreApi<ConnectionState>> = create<ConnectionState>()(
  devtools(
    (set, get) => ({
      loading: 'finished',
      connections: undefined,
      currentConnectionId: undefined,
      currentConnection: (): ConnectionType | undefined => {
        const { connections, currentConnectionId } = get();

        if (!connections || connections.length === 0) return undefined;

        return connections.find((c) => c.id === Number(currentConnectionId));
      },
      updateLoading: (loading: LoadingType): void => {
        set({ loading });
      },
      updateConnections: (connections: ConnectionType[]): void => {
        set({ connections });
      },
      updateCurrentConnection: (currentConnection: ConnectionType | undefined): void => {
        if (!currentConnection) return;

        let connections = get().connections;
        if (!connections) return;

        connections = connections.map((c: ConnectionType) => {
          if (c.id === currentConnection.id) {
            return {
              ...currentConnection,
              isActive: true
            };
          }
          return c;
        });

        set({ connections, currentConnectionId: currentConnection.id });
      }
    }),
    { name: 'connections' }
  )
);
