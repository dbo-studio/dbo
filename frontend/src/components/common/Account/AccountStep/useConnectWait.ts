import api from '@/api';
import type { AccountConnectStart, AccountSession } from '@/api/account/types';
import locales from '@/locales';
import { useEffect, useRef, useState } from 'react';

const POLL_MS = 2000;
// The website forgets an unfinished sign-in after 10 minutes.
const GIVE_UP_MS = 10 * 60 * 1000;

/** Polls for the browser sign-in, or takes the code the browser page shows. Idle while `start` is null. */
export function useConnectWait(
  start: AccountConnectStart | null,
  onSession: (session: AccountSession) => void
): {
  manual: string;
  setManual: (value: string) => void;
  error: string | null;
  submitManual: () => Promise<void>;
} {
  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);
  // The parent re-renders with a new callback; polling must not restart for that.
  const onSessionRef = useRef(onSession);
  useEffect(() => {
    onSessionRef.current = onSession;
  }, [onSession]);

  const code = start?.code;

  useEffect(() => {
    if (!code) {
      return undefined;
    }
    const startedAt = Date.now();
    let busy = false;
    let stopped = false;

    const timer = window.setInterval(() => {
      if (busy || stopped) {
        return;
      }
      if (Date.now() - startedAt > GIVE_UP_MS) {
        stopped = true;
        window.clearInterval(timer);
        setError(locales.account_connect_expired);
        return;
      }
      busy = true;
      api.account
        .connectPoll(code)
        .then((result) => {
          if (result.session && !stopped) {
            stopped = true;
            window.clearInterval(timer);
            onSessionRef.current(result.session);
          }
        })
        .catch(() => {
          if (!stopped) {
            stopped = true;
            window.clearInterval(timer);
            setError(locales.account_connect_expired);
          }
        })
        .finally(() => {
          busy = false;
        });
    }, POLL_MS);

    return (): void => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [code]);

  const submitManual = async (): Promise<void> => {
    setError(null);
    try {
      const result = await api.account.connectPoll(manual.trim());
      if (result.session) {
        onSession(result.session);
      } else {
        setError(locales.account_connect_expired);
      }
    } catch {
      setError(locales.account_connect_expired);
    }
  };

  return { manual, setManual, error, submitManual };
}
