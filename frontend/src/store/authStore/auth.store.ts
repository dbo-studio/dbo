import type { AuthStatusType, AuthUserIdentity } from '@/api/auth/types';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

type AuthGate = 'loading' | 'login' | 'totp' | 'change_password' | 'ready';

type AuthStore = {
  gate: AuthGate;
  mode: string;
  user?: AuthUserIdentity;
  totpChallengeToken?: string;
  applyStatus: (status: AuthStatusType) => void;
  setTotpChallenge: (token: string) => void;
  setGate: (gate: AuthGate) => void;
  clear: () => void;
};

export const useAuthStore: UseBoundStore<StoreApi<AuthStore>> = create<AuthStore>((set) => ({
  gate: 'loading',
  mode: 'none',
  user: undefined,
  totpChallengeToken: undefined,
  applyStatus: (status): void => {
    const needsAuth = status.mode === 'local';
    if (!needsAuth) {
      set({
        gate: 'ready',
        mode: status.mode,
        user: status.user,
        totpChallengeToken: undefined
      });
      return;
    }

    if (!status.authenticated) {
      set({
        gate: 'login',
        mode: status.mode,
        user: undefined,
        totpChallengeToken: undefined
      });
      return;
    }

    if (status.mustChangePassword) {
      set({
        gate: 'change_password',
        mode: status.mode,
        user: status.user,
        totpChallengeToken: undefined
      });
      return;
    }

    set({
      gate: 'ready',
      mode: status.mode,
      user: status.user,
      totpChallengeToken: undefined
    });
  },
  setTotpChallenge: (token): void =>
    set({
      gate: 'totp',
      totpChallengeToken: token
    }),
  setGate: (gate): void => set({ gate }),
  clear: (): void =>
    set({
      gate: 'login',
      user: undefined,
      totpChallengeToken: undefined
    })
}));
