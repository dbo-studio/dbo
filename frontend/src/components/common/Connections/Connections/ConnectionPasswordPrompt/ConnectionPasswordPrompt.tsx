import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { FormError } from '@/components/base/FormError/FormError';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { EventFor } from '@/types';
import { Box, Button, Checkbox, FormControlLabel } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type JSX, useEffect, useMemo, useState } from 'react';
import * as v from 'valibot';

const formSchema = v.object({
  password: v.pipe(v.string(), v.minLength(1, 'Password is required')),
  rememberPassword: v.boolean()
});

export default function ConnectionPasswordPromptModal(): JSX.Element {
  const show = useSettingStore((s) => s.ui.showConnectionPasswordPrompt);
  const connectionId = useSettingStore((s) => s.ui.passwordPromptConnectionId);
  const updateUI = useSettingStore((s) => s.updateUI);
  const resetTree = useTreeStore((state) => state.reset)
  const queryClient = useQueryClient();
  const clearCurrentConnection = useConnectionStore((state) => state.clearCurrentConnection);

  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);

  const validationErrors = useMemo(() => {
    const result = v.safeParse(formSchema, { password, rememberPassword });
    return result.success ? [] : result.issues.map((i) => i.message);
  }, [password, rememberPassword]);

  const { mutateAsync: setPasswordMutation, isPending } = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!connectionId) {
        throw new Error('Missing connectionId');
      }
      await api.connection.setConnectionCredentials(connectionId, { password, rememberPassword });
    }
  });


  useEffect(() => {
    if (!show) return;
    clearCurrentConnection();
  }, [show])

  const handleClose = (): void => {
    setPassword('');
    setRememberPassword(false);
    updateUI({ showConnectionPasswordPrompt: false, passwordPromptConnectionId: undefined });
  };


  const handleSubmit = async (e: EventFor<"form", "onSubmit"> | EventFor<"button", "onClick">) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await setPasswordMutation()
      setPassword('');
      setRememberPassword(false);
      updateUI({ showConnectionPasswordPrompt: false, passwordPromptConnectionId: undefined });
      resetTree()
      queryClient.invalidateQueries({
        queryKey: ['connections']
      });
    } catch (e) {
      console.debug("🚀 ~ handleSubmit ~ e:", e)
    }
  }

  return (
    <Modal open={show} title={locales.password} onClose={handleClose}>
      <form onSubmit={handleSubmit}>
        <Box flex={1} display={'flex'} flexDirection={'column'}>
          <FieldInput
            name='password'
            value={password}
            label={locales.password}
            error={validationErrors.length > 0}
            onChange={(e): void => setPassword(e.target.value)}
          />
          <FormError mb={0} errors={validationErrors} />

          <Box display={'flex'} alignItems={'center'} mb={1}>
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
          </Box>
        </Box>
      </form>

      <Box display={'flex'} mt={2} justifyContent={'space-between'}>

        <Button size='small' onClick={handleClose}>
          {locales.cancel}
        </Button>
        <Button
          size='small'
          variant='contained'
          disabled={isPending || validationErrors.length > 0 || !connectionId}
          onClick={handleSubmit}
        >
          {locales.save}
        </Button>
      </Box>
    </Modal>
  );
}
