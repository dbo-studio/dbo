import { create, type StoreApi, type UseBoundStore } from 'zustand';

type SafeModePasswordRequest = {
  connectionId?: number;
  resolve: (result: { password?: string } | null) => void;
};

type SafeModePasswordStore = {
  open: boolean;
  connectionId?: number;
  request: (opts?: { connectionId?: number }) => Promise<{ password?: string } | null>;
  submitPassword: (password: string) => void;
  cancel: () => void;
};

let pending: SafeModePasswordRequest | null = null;

export const useSafeModePasswordStore: UseBoundStore<StoreApi<SafeModePasswordStore>> = create<SafeModePasswordStore>(
  (set) => ({
    open: false,
    connectionId: undefined,
    request: (opts): Promise<{ password?: string } | null> =>
      new Promise((resolve) => {
        pending = {
          connectionId: opts?.connectionId,
          resolve
        };
        set({
          open: true,
          connectionId: opts?.connectionId
        });
      }),
    submitPassword: (password: string): void => {
      pending?.resolve({ password });
      pending = null;
      set({ open: false, connectionId: undefined });
    },
    cancel: (): void => {
      pending?.resolve(null);
      pending = null;
      set({ open: false, connectionId: undefined });
    }
  })
);
