import { create } from 'zustand';

type CommandPaletteState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

export const useCommandPaletteStore = create<CommandPaletteState>()((set) => ({
  open: false,
  setOpen: (open): void => set({ open }),
  toggle: (): void => set((s) => ({ open: !s.open }))
}));
