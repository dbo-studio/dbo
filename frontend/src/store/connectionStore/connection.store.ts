import type { ConnectionType } from '@/types';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ConnectionPersistedState, ConnectionStore, LoadingType } from './types';

type ConnectionState = ConnectionStore;

const sortConnectionsByOrder = (connections: ConnectionType[], order: number[]): ConnectionType[] => {
  if (order.length === 0) {
    return connections;
  }

  const byId = new Map(connections.map((connection) => [connection.id, connection]));
  const sorted: ConnectionType[] = [];

  for (const id of order) {
    const connection = byId.get(id);
    if (connection) {
      sorted.push(connection);
      byId.delete(id);
    }
  }

  for (const connection of connections) {
    if (byId.has(connection.id)) {
      sorted.push(connection);
    }
  }

  return sorted;
};

export const useConnectionStore: UseBoundStore<StoreApi<ConnectionState>> = create<ConnectionState>()(
  devtools(
    persist(
      (set, get) => ({
        loading: 'finished',
        connections: undefined,
        currentConnectionId: undefined,
        connectionOrder: [],
        currentConnection: (): ConnectionType | undefined => {
          const { connections, currentConnectionId } = get();

          if (!connections || connections.length === 0 || currentConnectionId == null) {
            return undefined;
          }

          return connections.find((c) => c.id === Number(currentConnectionId));
        },
        updateLoading: (loading: LoadingType): void => {
          set({ loading }, undefined, 'updateLoading');
        },
        updateConnections: (connections: ConnectionType[]): void => {
          const sorted = sortConnectionsByOrder(connections, get().connectionOrder);
          set(
            {
              connections: sorted,
              connectionOrder: sorted.map((connection) => connection.id)
            },
            undefined,
            'updateConnections'
          );
        },
        reorderConnections: (activeId: string, overId: string): void => {
          const connections = get().connections;
          if (!connections) {
            return;
          }

          const activeIndex = connections.findIndex((connection) => String(connection.id) === activeId);
          const overIndex = connections.findIndex((connection) => String(connection.id) === overId);

          if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
            return;
          }

          const next = [...connections];
          const [removed] = next.splice(activeIndex, 1);
          next.splice(overIndex, 0, removed);

          set(
            {
              connections: next,
              connectionOrder: next.map((connection) => connection.id)
            },
            undefined,
            'reorderConnections'
          );
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

          set({ connections, currentConnectionId: currentConnection.id }, undefined, 'updateCurrentConnection');
        },
        patchConnectionSafeModeUnlock: (
          connectionId: number,
          unlock: { unlocked: boolean; until?: string }
        ): void => {
          const connections = get().connections;
          if (!connections) {
            return;
          }

          set(
            {
              connections: connections.map((connection) =>
                connection.id === connectionId
                  ? {
                      ...connection,
                      safeModeUnlocked: unlock.unlocked,
                      safeModeUnlockUntil: unlock.until
                    }
                  : connection
              )
            },
            undefined,
            'patchConnectionSafeModeUnlock'
          );
        },
        clearCurrentConnection: (): void => {
          set({ currentConnectionId: undefined }, undefined, 'clearCurrentConnection');
        }
      }),
      {
        name: 'connections',
        partialize: (state): ConnectionPersistedState => ({
          connectionOrder: state.connectionOrder
        }),
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<ConnectionPersistedState> | undefined;
          return {
            ...currentState,
            connectionOrder: persisted?.connectionOrder ?? currentState.connectionOrder
          };
        }
      }
    ),
    { name: 'connections' }
  )
);
