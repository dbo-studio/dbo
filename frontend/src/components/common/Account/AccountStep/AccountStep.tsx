import api from '@/api';
import type { AccountConnectStart, AccountSession } from '@/api/account/types';
import { FormError } from '@/components/base/FormError/FormError';
import locales from '@/locales';
import { useAccountStore } from '@/store/accountStore/account.store';
import { Box, Button, Typography, alpha } from '@mui/material';
import { Check, UserRound } from 'lucide-react';
import { type JSX, useCallback, useState } from 'react';
import ConnectWait from './ConnectWait';
import { openExternal } from './openExternal';

export type AccountStepProps = {
  /** Called when the app is connected to an account and ready to enter. */
  onDone: () => void;
};

const POINTS = [
  { id: 'point-1', text: locales.account_connect_point_1 },
  { id: 'point-2', text: locales.account_connect_point_2 },
  { id: 'point-3', text: locales.account_connect_point_3 }
];

/** The onboarding account step. Sign up and sign in happen on the website; this opens it and waits. */
export default function AccountStep({ onDone }: AccountStepProps): JSX.Element {
  const signIn = useAccountStore((state) => state.signIn);
  const [start, setStart] = useState<AccountConnectStart | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSession = useCallback(
    (session: AccountSession): void => {
      signIn(session);
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

  if (start) {
    return <ConnectWait start={start} onSession={handleSession} onCancel={(): void => setStart(null)} />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }} data-testid='account-step'>
      <Box
        sx={{
          width: 56,
          height: 56,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 3,
          color: 'primary.main',
          bgcolor: (theme): string => alpha(theme.palette.primary.main, 0.12)
        }}
      >
        <UserRound size={28} />
      </Box>
      <Typography variant='body1' color='text.secondary'>
        {locales.account_connect_intro}
      </Typography>
      <Button variant='contained' size='large' onClick={(): void => void connect()} data-testid='account-connect'>
        {locales.account_connect_button}
      </Button>
      <Box sx={{ display: 'grid', gap: 1.25 }}>
        {POINTS.map((point) => (
          <Box key={point.id} sx={{ display: 'flex', gap: 1.25, alignItems: 'center', color: 'text.secondary' }}>
            <Check size={16} />
            <Typography variant='body2'>{point.text}</Typography>
          </Box>
        ))}
      </Box>
      {error ? <FormError mb={0} errors={[error]} /> : null}
    </Box>
  );
}
