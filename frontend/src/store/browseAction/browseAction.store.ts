import { create } from 'zustand';

/** A dialog of the collection page that something outside it (the tree's context menu) wants opened. */
export type BrowseAction = 'stats' | 'schema' | 'aggregate' | 'rename';

type BrowseActionState = {
  request: { containerId: string; action: BrowseAction } | null;
  /** Ask for a dialog; the collection's page takes it when it is (or becomes) the open tab. */
  ask: (containerId: string, action: BrowseAction) => void;
  clear: () => void;
};

export const useBrowseActionStore = create<BrowseActionState>()((set) => ({
  request: null,
  ask: (containerId, action): void => set({ request: { containerId, action } }),
  clear: (): void => set({ request: null })
}));
