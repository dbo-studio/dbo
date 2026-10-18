import { create } from 'zustand';

type BackupModalState = {
  /** Connection whose backups are shown; null when closed. */
  connectionId: number | null;
  open: (connectionId: number) => void;
  close: () => void;
};

export const useBackupModalStore = create<BackupModalState>()((set) => ({
  connectionId: null,
  open: (connectionId): void => set({ connectionId }),
  close: (): void => set({ connectionId: null })
}));
