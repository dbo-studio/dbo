import { create, type StoreApi, type UseBoundStore } from 'zustand';

type ProdUnlockStore = {
  /** Connection name the user must type; null when the dialog is closed. */
  name: string | null;
  request: (name: string) => Promise<boolean>;
  answer: (typed: boolean) => void;
};

let pending: ((typed: boolean) => void) | null = null;

export const useProdUnlockStore: UseBoundStore<StoreApi<ProdUnlockStore>> = create<ProdUnlockStore>((set) => ({
  name: null,
  request: (name): Promise<boolean> =>
    new Promise((resolve) => {
      pending = resolve;
      set({ name });
    }),
  answer: (typed): void => {
    pending?.(typed);
    pending = null;
    set({ name: null });
  }
}));
