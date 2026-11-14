import { create } from 'zustand';

type TransactionStore = {
  /** Editor tabs with an open transaction, by tab id; the value is the connection it runs on. */
  byTab: Record<string, number>;
  set: (tabId: string, connectionId: number) => void;
  clear: (tabId: string) => void;
};

export const useTransactionStore = create<TransactionStore>((set) => ({
  byTab: {},
  set: (tabId, connectionId) => set((state) => ({ byTab: { ...state.byTab, [tabId]: connectionId } })),
  clear: (tabId) =>
    set((state) => ({ byTab: Object.fromEntries(Object.entries(state.byTab).filter(([id]) => id !== tabId)) }))
}));
