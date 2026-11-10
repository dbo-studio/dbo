import { create } from 'zustand';

/** What the left sidebar shows: the database explorer (Items, Queries, History) or the Boards list. */
export type ExplorerArea = 'explorer' | 'boards' | 'backup';

type ExplorerAreaState = {
  area: ExplorerArea;
  setArea: (area: ExplorerArea) => void;
};

export const useExplorerAreaStore = create<ExplorerAreaState>()((set) => ({
  area: 'explorer',
  setArea: (area): void => set({ area })
}));
