import { unlockWithBiometrics } from '@/core/tauri/biometry';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

export type SafeModePasswordMode = 'setup' | 'unlock' | 'change';

export type SafeModePasswordResult = {
  password?: string;
  confirm?: string;
  currentPassword?: string;
};

type SafeModePasswordRequest = {
  connectionId?: number;
  mode: SafeModePasswordMode;
  resolve: (result: SafeModePasswordResult | null) => void;
};

type SafeModePasswordStore = {
  open: boolean;
  mode: SafeModePasswordMode;
  connectionId?: number;
  request: (opts?: { connectionId?: number; mode?: SafeModePasswordMode }) => Promise<SafeModePasswordResult | null>;
  submitPassword: (password: string, confirm?: string, currentPassword?: string) => void;
  cancel: () => void;
};

let pending: SafeModePasswordRequest | null = null;

export const useSafeModePasswordStore: UseBoundStore<StoreApi<SafeModePasswordStore>> = create<SafeModePasswordStore>(
  (set) => ({
    open: false,
    mode: 'unlock',
    connectionId: undefined,
    request: (opts): Promise<SafeModePasswordResult | null> => {
      const mode = opts?.mode ?? 'unlock';
      const connectionId = opts?.connectionId;

      return (async () => {
        if (mode === 'unlock') {
          const stored = await unlockWithBiometrics();
          if (stored) {
            return { password: stored };
          }
        }

        return await new Promise<SafeModePasswordResult | null>((resolve) => {
          pending = {
            connectionId,
            mode,
            resolve
          };
          set({
            open: true,
            connectionId,
            mode
          });
        });
      })();
    },
    submitPassword: (password: string, confirm?: string, currentPassword?: string): void => {
      pending?.resolve({ password, confirm, currentPassword });
      pending = null;
      set({ open: false, connectionId: undefined, mode: 'unlock' });
    },
    cancel: (): void => {
      pending?.resolve(null);
      pending = null;
      set({ open: false, connectionId: undefined, mode: 'unlock' });
    }
  })
);
