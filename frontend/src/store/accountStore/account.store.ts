import type { AccountSession, AccountUser } from '@/api/account/types';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { persist } from 'zustand/middleware';

type AccountStore = {
  token?: string;
  user?: AccountUser;
  onboarded: boolean;
  signIn: (session: AccountSession) => void;
  signOut: () => void;
  finishOnboarding: () => void;
};

export const useAccountStore: UseBoundStore<StoreApi<AccountStore>> = create<AccountStore>()(
  persist(
    (set) => ({
      token: undefined,
      user: undefined,
      onboarded: false,
      signIn: (session): void => {
        set({ token: session.token, user: session.user });
      },
      signOut: (): void => {
        set({ token: undefined, user: undefined });
      },
      finishOnboarding: (): void => {
        set({ onboarded: true });
      }
    }),
    {
      name: 'dbo:account',
      partialize: (state) => ({ token: state.token, user: state.user, onboarded: state.onboarded })
    }
  )
);

export const useIsSignedIn = (): boolean => useAccountStore((state) => Boolean(state.token));
