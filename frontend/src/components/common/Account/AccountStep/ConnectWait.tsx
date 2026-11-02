import api from '@/api';
import type { AccountConnectStart, AccountSession } from '@/api/account/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import locales from '@/locales';
import { Box, Button, Link, Typography } from '@mui/material';
import { type JSX, useEffect, useRef, useState } from 'react';
import { openExternal } from './openExternal';

const POLL_MS = 2000;
// The website forgets an unfinished sign-in after 10 minutes.
const GIVE_UP_MS = 10 * 60 * 1000;

export type ConnectWaitProps = {
  start: AccountConnectStart;
  onSession: (session: AccountSession) => void;
  onCancel: () => void;
};

/** Waits for the browser sign-in to finish: polls by itself, or takes the code the browser page shows. */
export default function ConnectWait({ start, onSession, onCancel }: ConnectWaitProps): JSX.Element {
  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);
  // The parent re-renders with a new callback; polling must not restart for that.
  const onSessionRef = useRef(onSession);
  useEffect(() => {
    onSessionRef.current = onSession;
  }, [onSession]);

  useEffect(() => {
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
        .connectPoll(start.code)
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
  }, [start.code]);

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }} data-testid='account-connect-wait'>
      <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
        {locales.account_connect_title}
      </Typography>
      <Typography variant='body2' color='text.secondary'>
        {locales.account_connect_hint}
      </Typography>
      <Link
        component='button'
        type='button'
        underline='hover'
        sx={{ alignSelf: 'flex-start' }}
        onClick={(): void => void openExternal(start.url)}
      >
        {locales.account_connect_open_again}
      </Link>

      <Typography variant='caption' color='text.secondary'>
        {locales.account_connect_manual}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <FieldInput
            name='code'
            label={locales.account_connect_code}
            value={manual}
            fullWidth
            onChange={(e): void => setManual(e.target.value)}
            inputProps={{ 'data-testid': 'account-connect-code' }}
          />
        </Box>
        <Button
          variant='outlined'
          sx={{ mt: 2.5 }}
          disabled={manual.trim().length === 0}
          onClick={(): void => void submitManual()}
          data-testid='account-connect-submit'
        >
          {locales.account_connect_submit}
        </Button>
      </Box>

      {error ? <FormError mb={0} errors={[error]} /> : null}

      <Button size='small' onClick={onCancel} sx={{ alignSelf: 'flex-start' }} data-testid='account-connect-cancel'>
        {locales.account_connect_cancel}
      </Button>
    </Box>
  );
}
