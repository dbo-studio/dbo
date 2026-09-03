import api from '@/api';
import {
  deviceBiometricsAvailable,
  persistSafeModePassword,
  removeSafeModePassword,
  storeSafeModePassword
} from '@/core/tauri/biometry';
import locales from '@/locales';
import { useSafeModePasswordStore } from '@/store/safeModePassword/safeModePassword.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Button, Divider, Switch, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { GeneralPanelSettingRowStyled } from '../../GeneralPanel/GeneralPanel.styled';

export function SafeModeSettings(): JSX.Element {
  const queryClient = useQueryClient();
  const enableBiometrics = useSettingStore((state) => state.general.enableSafeModeBiometrics);
  const updateGeneral = useSettingStore((state) => state.updateGeneral);
  const [showBiometrics, setShowBiometrics] = useState(false);

  const { data: passwordStatus } = useQuery({
    queryKey: ['safe-mode-password'],
    queryFn: api.safeMode.getStatus
  });

  const { mutateAsync: setPassword, isPending: isSettingPassword } = useMutation({
    mutationFn: ({ password, confirm }: { password: string; confirm: string }) =>
      api.safeMode.setPassword(password, confirm)
  });

  const { mutateAsync: changePassword, isPending: isChangingPassword } = useMutation({
    mutationFn: ({
      currentPassword,
      password,
      confirm
    }: {
      currentPassword: string;
      password: string;
      confirm: string;
    }) => api.safeMode.changePassword(currentPassword, password, confirm)
  });

  useEffect(() => {
    void deviceBiometricsAvailable().then(setShowBiometrics);
  }, []);

  const configured = Boolean(passwordStatus?.configured);

  const handleSetPassword = async (): Promise<void> => {
    const result = await useSafeModePasswordStore.getState().request({ mode: 'setup' });
    if (!result?.password) {
      return;
    }

    try {
      await setPassword({
        password: result.password,
        confirm: result.confirm ?? result.password
      });
      await queryClient.invalidateQueries({ queryKey: ['safe-mode-password'] });
      toast.success(locales.safe_mode_password_saved);
      void storeSafeModePassword(result.password);
    } catch (error) {
      console.debug('🚀 ~ SafeModeSettings ~ handleSetPassword:', error);
      toast.error(locales.safe_mode_update_failed);
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    const result = await useSafeModePasswordStore.getState().request({ mode: 'change' });
    if (!result?.password || !result.currentPassword) {
      return;
    }

    try {
      await changePassword({
        currentPassword: result.currentPassword,
        password: result.password,
        confirm: result.confirm ?? result.password
      });
      toast.success(locales.safe_mode_password_changed);
      void storeSafeModePassword(result.password);
    } catch (error) {
      console.debug('🚀 ~ SafeModeSettings ~ handleChangePassword:', error);
      toast.error(locales.safe_mode_password_invalid);
    }
  };

  const handleBiometrics = async (checked: boolean): Promise<void> => {
    if (!checked) {
      await removeSafeModePassword();
      updateGeneral({ enableSafeModeBiometrics: false });
      toast.success(locales.safe_mode_biometrics_disabled);
      return;
    }

    let password: string | undefined;
    if (!configured) {
      const result = await useSafeModePasswordStore.getState().request({ mode: 'setup' });
      if (!result?.password) {
        return;
      }
      try {
        await setPassword({
          password: result.password,
          confirm: result.confirm ?? result.password
        });
        await queryClient.invalidateQueries({ queryKey: ['safe-mode-password'] });
        password = result.password;
      } catch (error) {
        console.debug('🚀 ~ SafeModeSettings ~ handleBiometrics setup:', error);
        toast.error(locales.safe_mode_update_failed);
        return;
      }
    } else {
      const result = await useSafeModePasswordStore.getState().request({ mode: 'unlock' });
      if (!result?.password) {
        return;
      }
      try {
        await api.safeMode.verify(result.password);
        password = result.password;
      } catch {
        toast.error(locales.safe_mode_password_invalid);
        return;
      }
    }

    try {
      if (password) {
        await persistSafeModePassword(password, { promptIfNeeded: true });
      }
      updateGeneral({ enableSafeModeBiometrics: true });
      toast.success(locales.safe_mode_biometrics_enabled);
    } catch (error) {
      console.debug('🚀 ~ SafeModeSettings ~ handleBiometrics persist:', error);
      toast.error(error instanceof Error ? error.message : locales.safe_mode_biometrics_failed);
    }
  };

  return (
    <Box>
      <GeneralPanelSettingRowStyled>
        <Box>
          <Typography color='textTitle' variant='subtitle2'>
            {locales.safe_mode_password_label}
          </Typography>
          <Typography
            data-testid={configured ? 'safe-mode-settings-status' : undefined}
            color='textText'
            variant='caption'
          >
            {configured ? locales.safe_mode_password_configured : locales.safe_mode_password_setup_desc}
          </Typography>
        </Box>
        {configured ? (
          <Button
            data-testid='safe-mode-settings-change-password'
            variant='outlined'
            size='small'
            loading={isChangingPassword}
            onClick={() => void handleChangePassword()}
          >
            {locales.safe_mode_password_change}
          </Button>
        ) : (
          <Button
            data-testid='safe-mode-settings-set-password'
            variant='outlined'
            size='small'
            loading={isSettingPassword}
            onClick={() => void handleSetPassword()}
          >
            {locales.safe_mode_password_set}
          </Button>
        )}
      </GeneralPanelSettingRowStyled>
      <Divider />
      {showBiometrics && (
        <>
          <GeneralPanelSettingRowStyled sx={{ mt: 1 }}>
            <Box>
              <Typography color='textTitle' variant='subtitle2'>
                {locales.safe_mode_use_biometrics}
              </Typography>
              <Typography color='textText' variant='caption'>
                {locales.safe_mode_biometrics_desc}
              </Typography>
            </Box>
            <Switch
              checked={Boolean(enableBiometrics)}
              onChange={(_, checked) => void handleBiometrics(checked)}
              slotProps={{ input: { 'aria-label': locales.safe_mode_use_biometrics } }}
              data-testid='safe-mode-settings-biometrics'
            />
          </GeneralPanelSettingRowStyled>
          <Divider />
        </>
      )}
    </Box>
  );
}
