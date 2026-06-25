import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { EventFor } from '@/types';
import { Button, Checkbox, FormControlLabel, Stack } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as v from 'valibot';
import {
  ConnectionFormCheckboxRowStyled,
  ConnectionFormContainerStyled,
  ConnectionFormFooterStyled
} from './ConnectionPasswordPrompt.styled';

const formSchema = v.object({
  password: v.pipe(v.string(), v.minLength(1, 'Password is required')),
  rememberPassword: v.boolean()
});

export default function ConnectionPasswordPromptModal(): JSX.Element {
  const show = useSettingStore((s) => s.ui.showConnectionPasswordPrompt);
  const connectionId = useSettingStore((s) => s.ui.passwordPromptConnectionId);
  const connections = useConnectionStore((state) => state.connections);
  const updateUI = useSettingStore((s) => s.updateUI);
  const resetTree = useTreeStore((state) => state.reset);
  const queryClient = useQueryClient();
  const clearCurrentConnection = useConnectionStore((state) => state.clearCurrentConnection);

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
    if (!show) return;
    clearCurrentConnection();
  }, [show, clearCurrentConnection]);

  const handleClose = (): void => {
    setPassword('');
    setRememberPassword(false);
    updateUI({ showConnectionPasswordPrompt: false, passwordPromptConnectionId: undefined });
  };

  const handleSubmit = async (e: EventFor<'form', 'onSubmit'> | EventFor<'button', 'onClick'>) => {
    if (!connectionId) return;

    e.preventDefault();
    e.stopPropagation();
    try {
      await setPasswordMutation({ id: connectionId, password, rememberPassword });
      setPassword('');
      setRememberPassword(false);
      updateUI({ showConnectionPasswordPrompt: false, passwordPromptConnectionId: undefined });
      resetTree();
      await queryClient.invalidateQueries({
        queryKey: ['connections']
      });
    } catch (e) {
      console.debug('🚀 ~ handleSubmit ~ e:', e);
    }
  };

  const handlePing = async (e: EventFor<'button', 'onClick'>) => {
    if (!connectionId) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      const currentConnection = connections?.find((c) => (c.id = connectionId));
      if (!currentConnection) return;

      const options = {
        ...currentConnection.options,
        password
      };

      await pingConnectionMutation({ id: connectionId, type: currentConnection.type, options });
      toast.success(locales.connection_test_success);
    } catch (e) {
      console.debug('🚀 ~ handlePing ~ e:', e);
    }
  };

  return (
    <Modal open={show} title={locales.password} onClose={handleClose}>
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
