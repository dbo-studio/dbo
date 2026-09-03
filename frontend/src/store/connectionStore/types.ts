import type { ConnectionType } from '@/types';

export type ConnectionStore = {
  loading: LoadingType;
  connections: ConnectionType[] | undefined;
  currentConnectionId: string | number | undefined;
  connectionOrder: number[];

  currentConnection: () => ConnectionType | undefined;
  updateLoading: (loading: LoadingType) => void;
  updateConnections: (connections: ConnectionType[]) => void;
  reorderConnections: (activeId: string, overId: string) => void;
  updateCurrentConnection: (connection: ConnectionType | undefined) => void;
  patchConnectionSafeModeUnlock: (connectionId: number, unlock: { unlocked: boolean; until?: string }) => void;
  clearCurrentConnection: () => void;
};

export type LoadingType = 'loading' | 'error' | 'finished';

export type ConnectionPersistedState = {
  connectionOrder: number[];
};
