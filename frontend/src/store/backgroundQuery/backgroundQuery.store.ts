import { create } from 'zustand';

/** A query a tab sent to the background: the tab shows a waiting state until the job ends. */
export type BackgroundQuery = {
  jobId: number;
  kind: 'run' | 'raw';
  startedAt: number;
};

type BackgroundQueryStore = {
  byTab: Record<string, BackgroundQuery>;
  /** Counts, per tab, the results delivered from the background; a screen showing that tab reloads when it grows. */
  delivered: Record<string, number>;
  start: (tabId: string, query: BackgroundQuery) => void;
  clear: (tabId: string) => void;
  deliver: (tabId: string) => void;
};

export const useBackgroundQueryStore = create<BackgroundQueryStore>((set) => ({
  byTab: {},
  delivered: {},
  deliver: (tabId) => set((state) => ({ delivered: { ...state.delivered, [tabId]: (state.delivered[tabId] ?? 0) + 1 } })),
  start: (tabId, query) => set((state) => ({ byTab: { ...state.byTab, [tabId]: query } })),
  clear: (tabId) => set((state) => ({ byTab: Object.fromEntries(Object.entries(state.byTab).filter(([id]) => id !== tabId)) }))
}));
