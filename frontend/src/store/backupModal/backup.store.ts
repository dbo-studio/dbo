import { create } from 'zustand';

type BackupModalState = {
  /** Connection whose backups are shown; null when closed. */
  connectionId: number | null;
  /** Database picked from a tree node; the dialog falls back to the connection's own. */
  database?: string;
  open: (connectionId: number, database?: string) => void;
  close: () => void;
};

export const useBackupModalStore = create<BackupModalState>()((set) => ({
  connectionId: null,
  database: undefined,
  open: (connectionId, database): void => set({ connectionId, database }),
  close: (): void => set({ connectionId: null, database: undefined })
}));
