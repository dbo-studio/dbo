import api from '@/api';
import type { AccountConnectStart, AccountSession } from '@/api/account/types';
import locales from '@/locales';
import { useAccountStore } from '@/store/accountStore/account.store';
import { useCallback, useState } from 'react';
import { openExternal } from './openExternal';

/** Browser sign-in flow state: idle until `connect` opens the website, then waiting for the session. */
export function useAccountConnect(onDone: () => void): {
  start: AccountConnectStart | null;
  error: string | null;
  connect: () => Promise<void>;
  cancel: () => void;
  handleSession: (session: AccountSession) => void;
} {
  const signIn = useAccountStore((state) => state.signIn);
  const [start, setStart] = useState<AccountConnectStart | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSession = useCallback(
    (session: AccountSession): void => {
      signIn(session);
      setStart(null);
      onDone();
    },
    [signIn, onDone]
  );

  const connect = async (): Promise<void> => {
    setError(null);
    try {
      const next = await api.account.connectStart();
      await openExternal(next.url);
      setStart(next);
    } catch {
      setError(locales.account_failed);
    }
  };

  const cancel = useCallback((): void => setStart(null), []);

  return { start, error, connect, cancel, handleSession };
}
