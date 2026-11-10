import Modal from '@/components/base/Modal/Modal';
import { FormError } from '@/components/base/FormError/FormError';
import locales from '@/locales';
import { Box, Button } from '@mui/material';
import type { JSX } from 'react';
import AccountIntro from './AccountStep/AccountIntro';
import { ConnectWaitBody } from './AccountStep/ConnectWait';
import { useAccountConnect } from './AccountStep/useAccountConnect';
import { useConnectWait } from './AccountStep/useConnectWait';

export type AccountModalProps = {
  open: boolean;
  onClose: () => void;
};

/** Sign in to the DBO account from a dialog. Actions live in the modal footer. */
export default function AccountModal({ open, onClose }: AccountModalProps): JSX.Element {
  const { start, error: connectError, connect, cancel, handleSession } = useAccountConnect(onClose);
  const wait = useConnectWait(start, handleSession);

  const handleClose = (): void => {
    cancel();
    onClose();
  };

  const footer = start ? (
    <>
      <Button size='small' onClick={cancel} data-testid='account-connect-cancel'>
        {locales.account_connect_cancel}
      </Button>
      <Button
        size='small'
        variant='contained'
        disabled={wait.manual.trim().length === 0}
        onClick={(): void => void wait.submitManual()}
        data-testid='account-connect-submit'
      >
        {locales.account_connect_submit}
      </Button>
    </>
  ) : (
    <>
      <Button size='small' onClick={handleClose}>
        {locales.account_connect_cancel}
      </Button>
      <Button size='small' variant='contained' onClick={(): void => void connect()} data-testid='account-connect'>
        {locales.account_connect_button}
      </Button>
    </>
  );

  return (
    <Modal open={open} title={locales.account_row_title} onClose={handleClose} footer={footer}>
      <Box sx={{ width: 'min(400px, calc(100vw - 96px))', pt: 1 }}>
        {start ? (
          <ConnectWaitBody
            start={start}
            manual={wait.manual}
            onManualChange={wait.setManual}
            error={wait.error}
            showTitle={false}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }} data-testid='account-step'>
            <AccountIntro />
            {connectError ? <FormError mb={0} errors={[connectError]} /> : null}
          </Box>
        )}
      </Box>
    </Modal>
  );
}
