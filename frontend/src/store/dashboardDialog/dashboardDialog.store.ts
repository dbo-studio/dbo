import { create } from 'zustand';

/** The name prompt for creating or renaming a dashboard, opened from the tree menu and shown by AppHosts. */
type DashboardDialogState = {
  target: { mode: 'new' } | { mode: 'rename'; id: number; name: string } | null;
  openNew: () => void;
  openRename: (id: number, name: string) => void;
  close: () => void;
};

export const useDashboardDialogStore = create<DashboardDialogState>((set) => ({
  target: null,
  openNew: () => set({ target: { mode: 'new' } }),
  openRename: (id, name) => set({ target: { mode: 'rename', id, name } }),
  close: () => set({ target: null })
}));
