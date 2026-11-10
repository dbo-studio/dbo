import type { AccountConnectStart, AccountSession } from '@/api/account/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import locales from '@/locales';
import { Box, Button, Link, Typography } from '@mui/material';
import type { JSX } from 'react';
import { openExternal } from './openExternal';
import { useConnectWait } from './useConnectWait';

export type ConnectWaitBodyProps = {
  start: AccountConnectStart;
  manual: string;
  onManualChange: (value: string) => void;
  error: string | null;
  /** Title is skipped inside a modal, where the modal title already says it. */
  showTitle?: boolean;
  children?: React.ReactNode;
};

/** The wait screen's content: hint, link back to the browser, and the code field. No actions. */
export function ConnectWaitBody({
  start,
  manual,
  onManualChange,
  error,
  showTitle = true,
  children
}: ConnectWaitBodyProps): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }} data-testid='account-connect-wait'>
      {showTitle ? (
        <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
          {locales.account_connect_title}
        </Typography>
      ) : null}
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
            onChange={(e): void => onManualChange(e.target.value)}
            inputProps={{ 'data-testid': 'account-connect-code' }}
          />
        </Box>
        {children}
      </Box>

      {error ? <FormError mb={0} errors={[error]} /> : null}
    </Box>
  );
}

export type ConnectWaitProps = {
  start: AccountConnectStart;
  onSession: (session: AccountSession) => void;
  onCancel: () => void;
};

/** Inline wait screen (onboarding): polls by itself, or takes the code the browser page shows. */
export default function ConnectWait({ start, onSession, onCancel }: ConnectWaitProps): JSX.Element {
  const { manual, setManual, error, submitManual } = useConnectWait(start, onSession);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      <ConnectWaitBody start={start} manual={manual} onManualChange={setManual} error={error}>
        <Button
          variant='outlined'
          sx={{ mt: 2.5 }}
          disabled={manual.trim().length === 0}
          onClick={(): void => void submitManual()}
          data-testid='account-connect-submit'
        >
          {locales.account_connect_submit}
        </Button>
      </ConnectWaitBody>
      <Button size='small' onClick={onCancel} sx={{ alignSelf: 'flex-start' }} data-testid='account-connect-cancel'>
        {locales.account_connect_cancel}
      </Button>
    </Box>
  );
}
