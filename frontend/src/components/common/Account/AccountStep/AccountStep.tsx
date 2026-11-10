import { FormError } from '@/components/base/FormError/FormError';
import locales from '@/locales';
import { Box, Button } from '@mui/material';
import type { JSX } from 'react';
import AccountIntro from './AccountIntro';
import ConnectWait from './ConnectWait';
import { useAccountConnect } from './useAccountConnect';

export type AccountStepProps = {
  /** Called when the app is connected to an account and ready to enter. */
  onDone: () => void;
};

/** The onboarding account step. Sign up and sign in happen on the website; this opens it and waits. */
export default function AccountStep({ onDone }: AccountStepProps): JSX.Element {
  const { start, error, connect, cancel, handleSession } = useAccountConnect(onDone);

  if (start) {
    return <ConnectWait start={start} onSession={handleSession} onCancel={cancel} />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }} data-testid='account-step'>
      <AccountIntro
        action={
          <Button variant='contained' size='large' onClick={(): void => void connect()} data-testid='account-connect'>
            {locales.account_connect_button}
          </Button>
        }
      />
      {error ? <FormError mb={0} errors={[error]} /> : null}
    </Box>
  );
}
