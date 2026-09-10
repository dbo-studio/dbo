import type { AuthStatusType, AuthUserIdentity } from '@/api/auth/types';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

type AuthGate = 'loading' | 'login' | 'change_password' | 'ready';

type AuthStore = {
  gate: AuthGate;
  mode: string;
  user?: AuthUserIdentity;
  applyStatus: (status: AuthStatusType) => void;
  setGate: (gate: AuthGate) => void;
  clear: () => void;
};

export const useAuthStore: UseBoundStore<StoreApi<AuthStore>> = create<AuthStore>((set) => ({
  gate: 'loading',
  mode: 'none',
  user: undefined,
  applyStatus: (status): void => {
    const needsAuth = status.mode === 'local';
    if (!needsAuth) {
      set({
        gate: 'ready',
        mode: status.mode,
        user: status.user
      });
      return;
    }

    if (!status.authenticated) {
      set({
        gate: 'login',
        mode: status.mode,
        user: undefined
      });
      return;
    }

    if (status.mustChangePassword) {
      set({
        gate: 'change_password',
        mode: status.mode,
        user: status.user
      });
      return;
    }

    set({
      gate: 'ready',
      mode: status.mode,
      user: status.user
    });
  },
  setGate: (gate): void => set({ gate }),
  clear: (): void =>
    set({
      gate: 'login',
      user: undefined
    })
}));
