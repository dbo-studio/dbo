import locales from '@/locales';
import { Button } from '@mui/material';
import type { JSX } from 'react';

type TotpSetupActionsProps = {
  enableCode: string;
  isEnabling: boolean;
  onCancel: () => void;
  onEnable: () => void;
};

export function TotpSetupActions({ enableCode, isEnabling, onCancel, onEnable }: TotpSetupActionsProps): JSX.Element {
  return (
    <>
      <Button onClick={onCancel}>{locales.cancel}</Button>
      <Button
        variant='contained'
        disabled={isEnabling || enableCode.length < 6}
        data-testid='auth-totp-enable-submit'
        onClick={onEnable}
      >
        {locales.auth_totp_enable}
      </Button>
    </>
  );
}