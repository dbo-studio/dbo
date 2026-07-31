import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import Modal from '@/components/base/Modal/Modal';
import {
  ConnectionFormCheckboxRowStyled,
  ConnectionFormContainerStyled,
  ConnectionFormFooterStyled
} from '@/components/common/Connections/Connections/ConnectionPasswordPrompt/ConnectionPasswordPrompt.styled';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { EventFor } from '@/types';
import { Button, Checkbox, FormControlLabel, Stack } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { type JSX, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as v from 'valibot';
import type { SafeModePasswordPromptProps } from './types';

const formSchema = v.object({
  password: v.pipe(v.string(), v.minLength(1, 'Password is required')),
  rememberPassword: v.boolean()
});

export default function SafeModePasswordPrompt({
  open,
  connectionId,
  onCancel,
  onPassword
}: SafeModePasswordPromptProps): JSX.Element {
  const connections = useConnectionStore((state) => state.connections);
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);

  const validationErrors = useMemo(() => {
    const result = v.safeParse(formSchema, { password, rememberPassword });
    return result.success ? [] : result.issues.map((i) => i.message);
  }, [password, rememberPassword]);

  const { mutateAsync: setPasswordMutation, isPending } = useMutation({
    mutationFn: api.connection.setConnectionCredentials
  });

  const { mutateAsync: pingConnectionMutation, isPending: pingConnectionPending } = useMutation({
    mutationFn: api.connection.pingConnection
  });

  useEffect(() => {
    if (!open) {
      setPassword('');
      setRememberPassword(false);
    }
  }, [open]);

  const handleClose = (): void => {
    setPassword('');
    setRememberPassword(false);
    onCancel();
  };

  const handleSubmit = async (e: EventFor<'form', 'onSubmit'> | EventFor<'button', 'onClick'>): Promise<void> => {
    if (!connectionId) return;

    e.preventDefault();
    e.stopPropagation();
    try {
      if (rememberPassword) {
        await setPasswordMutation({ id: connectionId, password, rememberPassword });
      }
      await onPassword(password);
      setPassword('');
      setRememberPassword(false);
    } catch (error) {
      console.debug('🚀 ~ SafeModePasswordPrompt ~ handleSubmit:', error);
      toast.error(locales.safe_mode_password_invalid);
    }
  };

  const handlePing = async (e: EventFor<'button', 'onClick'>): Promise<void> => {
    if (!connectionId) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      const currentConnection = connections?.find((c) => c.id === connectionId);
      if (!currentConnection) return;

      await pingConnectionMutation({
        id: connectionId,
        type: currentConnection.type,
        options: {
          ...currentConnection.options,
          password
        }
      });
      toast.success(locales.connection_test_success);
    } catch (error) {
      console.debug('🚀 ~ SafeModePasswordPrompt ~ handlePing:', error);
    }
  };

  return (
    <Modal open={open} title={locales.password} onClose={handleClose}>
      <ConnectionFormContainerStyled>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <FieldInput
            name='password'
            value={password}
            label={locales.password}
            error={validationErrors.length > 0}
            onChange={(e): void => setPassword(e.target.value)}
          />
          <FormError mb={0} errors={validationErrors} />

          <ConnectionFormCheckboxRowStyled>
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberPassword}
                  size={'small'}
                  onChange={(e): void => setRememberPassword(e.target.checked)}
                />
              }
              label={locales.remember_password}
            />
          </ConnectionFormCheckboxRowStyled>
        </form>
      </ConnectionFormContainerStyled>
      <ConnectionFormFooterStyled>
        <Button size='small' onClick={handleClose}>
          {locales.cancel}
        </Button>
        <Stack spacing={1} direction={'row'}>
          <Button
            data-testid='test-connection'
            loadingPosition='start'
            loading={pingConnectionPending}
            onClick={(e) => void handlePing(e)}
            disabled={pingConnectionPending || validationErrors.length > 0 || !connectionId}
            size='small'
            variant='contained'
            color='secondary'
          >
            {locales.test}
          </Button>
          <Button
            size='small'
            variant='contained'
            disabled={isPending || validationErrors.length > 0 || !connectionId}
            onClick={(e) => void handleSubmit(e)}
          >
            {locales.save}
          </Button>
        </Stack>
      </ConnectionFormFooterStyled>
    </Modal>
  );
}
