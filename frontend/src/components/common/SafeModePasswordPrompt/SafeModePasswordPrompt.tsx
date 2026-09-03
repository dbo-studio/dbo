import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import Modal from '@/components/base/Modal/Modal';
import {
  ConnectionFormContainerStyled,
  ConnectionFormFooterStyled
} from '@/components/common/Connections/Connections/ConnectionPasswordPrompt/ConnectionPasswordPrompt.styled';
import { loadSafeModePassword, safeModeBiometricsAvailable } from '@/core/tauri/biometry';
import locales from '@/locales';
import { EventFor } from '@/types';
import { Button, Stack } from '@mui/material';
import { type JSX, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { SafeModePasswordPromptProps } from './types';

export default function SafeModePasswordPrompt({
  open,
  mode,
  onCancel,
  onPassword
}: SafeModePasswordPromptProps): JSX.Element {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsPending, setBiometricsPending] = useState(false);
  const isSetup = mode === 'setup';
  const isChange = mode === 'change';
  const needsConfirm = isSetup || isChange;

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if ((isChange && !currentPassword) || !password) {
      errors.push(locales.password_required);
    }
    if (needsConfirm && password && password !== confirm) {
      errors.push(locales.safe_mode_password_mismatch);
    }
    return errors;
  }, [confirm, currentPassword, isChange, needsConfirm, password]);

  useEffect(() => {
    if (!open || needsConfirm) {
      return;
    }

    void safeModeBiometricsAvailable().then(setBiometricsAvailable);
  }, [needsConfirm, open]);

  const reset = (): void => {
    setCurrentPassword('');
    setPassword('');
    setConfirm('');
  };

  const handleClose = (): void => {
    reset();
    onCancel();
  };

  const handleSubmit = async (e: EventFor<'form', 'onSubmit'> | EventFor<'button', 'onClick'>): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();

    if (validationErrors.length > 0) {
      return;
    }

    await onPassword(password, needsConfirm ? confirm : undefined, isChange ? currentPassword : undefined);
    reset();
  };

  const handleBiometrics = async (): Promise<void> => {
    setBiometricsPending(true);
    try {
      const stored = await loadSafeModePassword();
      if (!stored) {
        toast.error(locales.safe_mode_password_invalid);
        return;
      }

      await onPassword(stored);
      reset();
    } catch {
      toast.error(locales.safe_mode_password_invalid);
    } finally {
      setBiometricsPending(false);
    }
  };

  const title = isSetup
    ? locales.safe_mode_password_setup_title
    : isChange
      ? locales.safe_mode_password_change_title
      : locales.safe_mode_password_title;

  return (
    <Modal open={open} title={title} onClose={handleClose} zIndex={2000}>
      <ConnectionFormContainerStyled data-testid='safe-mode-password-prompt'>
        <form onSubmit={(e) => void handleSubmit(e)}>
          {isChange && (
            <FieldInput
              name='currentPassword'
              type='password'
              value={currentPassword}
              label={locales.safe_mode_password_current}
              error={validationErrors.length > 0}
              onChange={(e): void => setCurrentPassword(e.target.value)}
            />
          )}
          <FieldInput
            name='password'
            type='password'
            value={password}
            label={isChange ? locales.safe_mode_password_new : locales.password}
            error={validationErrors.length > 0}
            onChange={(e): void => setPassword(e.target.value)}
          />
          {needsConfirm && (
            <FieldInput
              name='confirm'
              type='password'
              value={confirm}
              label={locales.safe_mode_password_confirm}
              error={validationErrors.length > 0}
              onChange={(e): void => setConfirm(e.target.value)}
            />
          )}
          <FormError mb={0} errors={validationErrors} />
        </form>
      </ConnectionFormContainerStyled>
      <ConnectionFormFooterStyled>
        <Button size='small' onClick={handleClose}>
          {locales.cancel}
        </Button>
        <Stack spacing={1} direction={'row'}>
          {biometricsAvailable && (
            <Button
              data-testid='safe-mode-biometrics'
              size='small'
              variant='outlined'
              loading={biometricsPending}
              loadingPosition='start'
              onClick={() => void handleBiometrics()}
            >
              {locales.safe_mode_use_biometrics}
            </Button>
          )}
          <Button
            data-testid='safe-mode-password-save'
            size='small'
            variant='contained'
            disabled={validationErrors.length > 0}
            onClick={(e) => void handleSubmit(e)}
          >
            {locales.save}
          </Button>
        </Stack>
      </ConnectionFormFooterStyled>
    </Modal>
  );
}
