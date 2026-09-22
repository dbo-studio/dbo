import api from '@/api';
import type { AuthTotpSetupResponse } from '@/api/auth/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import { SettingRow } from '@/components/common/Settings/SettingRow/SettingRow';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { Box, Button } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import { TotpSetupModal } from './TotpSetupModal';
import { TotpSetupPanelStyled } from './TotpSettings.styled';

export function TotpSettings(): JSX.Element | null {
  const mode = useAuthStore((s) => s.mode);
  const queryClient = useQueryClient();
  const [setupOpen, setSetupOpen] = useState(false);
  const [setup, setSetup] = useState<AuthTotpSetupResponse | null>(null);
  const [enableCode, setEnableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disableOpen, setDisableOpen] = useState(false);
  const [enableError, setEnableError] = useState<string | null>(null);
  const [disableError, setDisableError] = useState<string | null>(null);
  const { data: status } = useQuery({
    queryKey: ['auth-totp-status'],
    queryFn: api.auth.getTotpStatus,
    enabled: mode === 'local'
  });

  const closeSetupModal = (): void => {
    setSetupOpen(false);
    setSetup(null);
    setEnableCode('');
    setEnableError(null);
  };

  const setupMutation = useMutation({
    mutationFn: api.auth.setupTotp,
    onSuccess: (data) => {
      setSetup(data);
      setEnableCode('');
      setEnableError(null);
    },
    onError: () => {
      toast.error(locales.auth_totp_setup_failed);
      setSetupOpen(false);
    }
  });

  const enableMutation = useMutation({
    mutationFn: (code: string) => api.auth.enableTotp(code),
    onSuccess: async () => {
      toast.success(locales.auth_totp_enabled);
      closeSetupModal();
      await queryClient.invalidateQueries({ queryKey: ['auth-totp-status'] });
      const authStatus = await api.auth.getStatus();
      useAuthStore.getState().applyStatus(authStatus);
    },
    onError: () => {
      setEnableError(locales.auth_totp_invalid);
      toast.error(locales.auth_totp_invalid);
    }
  });

  const disableMutation = useMutation({
    mutationFn: () => api.auth.disableTotp(disablePassword, disableCode),
    onSuccess: async () => {
      toast.success(locales.auth_totp_disabled);
      setDisableOpen(false);
      setDisablePassword('');
      setDisableCode('');
      await queryClient.invalidateQueries({ queryKey: ['auth-totp-status'] });
      const authStatus = await api.auth.getStatus();
      useAuthStore.getState().applyStatus(authStatus);
    },
    onError: () => {
      setDisableError(locales.auth_totp_disable_failed);
      toast.error(locales.auth_totp_disable_failed);
    }
  });

  const handleOpenSetup = (): void => {
    setSetupOpen(true);
    setSetup(null);
    setEnableCode('');
    setEnableError(null);
    void setupMutation.mutateAsync();
  };

  if (mode !== 'local') {
    return null;
  }

  const enabled = Boolean(status?.enabled);

  return (
    <>
      <SettingRow
        id='security.totp'
        label={locales.auth_totp_label}
        description={enabled ? locales.auth_totp_enabled_desc : locales.auth_totp_disabled_desc}
        control={
          enabled ? (
            disableOpen ? (
              <TotpSetupPanelStyled sx={{ gap: 1.5, maxWidth: 360 }} data-testid='auth-totp-disable-form'>
                <FieldInput
                  type='password'
                  label={locales.auth_current_password}
                  value={disablePassword}
                  fullWidth
                  size='small'
                  onChange={(e): void => {
                    setDisablePassword(e.target.value);
                    setDisableError(null);
                  }}
                  inputProps={{ 'data-testid': 'auth-totp-disable-password' }}
                />
                <FieldInput
                  type='text'
                  label={locales.auth_totp_code}
                  value={disableCode}
                  fullWidth
                  size='small'
                  onChange={(e): void => {
                    setDisableCode(e.target.value);
                    setDisableError(null);
                  }}
                  inputProps={{ 'data-testid': 'auth-totp-disable-code', inputMode: 'numeric' }}
                />
                {disableError ? <FormError mb={0} errors={[disableError]} /> : null}
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button size='small' onClick={(): void => setDisableOpen(false)}>
                    {locales.cancel}
                  </Button>
                  <Button
                    variant='contained'
                    size='small'
                    color='error'
                    disabled={disableMutation.isPending}
                    data-testid='auth-totp-disable-submit'
                    onClick={(): void => {
                      void disableMutation.mutateAsync();
                    }}
                  >
                    {locales.auth_totp_disable}
                  </Button>
                </Box>
              </TotpSetupPanelStyled>
            ) : (
              <Button
                variant='outlined'
                size='small'
                color='error'
                data-testid='auth-totp-disable-open'
                onClick={(): void => setDisableOpen(true)}
              >
                {locales.auth_totp_disable}
              </Button>
            )
          ) : (
            <Button
              variant='outlined'
              size='small'
              loading={setupOpen && setupMutation.isPending}
              data-testid='auth-totp-setup'
              onClick={handleOpenSetup}
            >
              {locales.auth_totp_enable}
            </Button>
          )
        }
      />

      <TotpSetupModal
        open={setupOpen}
        setup={setup}
        isLoading={setupMutation.isPending}
        enableCode={enableCode}
        enableError={enableError}
        isEnabling={enableMutation.isPending}
        onEnableCodeChange={(value): void => {
          setEnableCode(value);
          setEnableError(null);
        }}
        onClose={closeSetupModal}
        onEnable={(): void => {
          void enableMutation.mutateAsync(enableCode);
        }}
      />
    </>
  );
}
