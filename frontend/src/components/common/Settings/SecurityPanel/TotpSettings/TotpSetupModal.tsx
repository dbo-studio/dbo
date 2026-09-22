import type { AuthTotpSetupResponse } from '@/api/auth/types';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { Box, CircularProgress } from '@mui/material';
import { type JSX } from 'react';
import { TotpSetupPanel } from './TotpSetupPanel';

export type TotpSetupModalProps = {
  open: boolean;
  setup: AuthTotpSetupResponse | null;
  isLoading: boolean;
  enableCode: string;
  enableError: string | null;
  isEnabling: boolean;
  onEnableCodeChange: (value: string) => void;
  onClose: () => void;
  onEnable: () => void;
};

export function TotpSetupModal({
  open,
  setup,
  isLoading,
  enableCode,
  enableError,
  isEnabling,
  onEnableCodeChange,
  onClose,
  onEnable
}: TotpSetupModalProps): JSX.Element {
  return (
    <Modal open={open} title={locales.auth_totp_title} onClose={onClose}>
      <Box
        data-testid='auth-totp-setup-modal'
        sx={{ display: 'flex', flexDirection: 'column', minWidth: 360, maxWidth: 420 }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : setup ? (
          <TotpSetupPanel
            variant='modal'
            setup={setup}
            enableCode={enableCode}
            enableError={enableError}
            isEnabling={isEnabling}
            onEnableCodeChange={onEnableCodeChange}
            onCancel={onClose}
            onEnable={onEnable}
          />
        ) : null}
      </Box>
    </Modal>
  );
}
