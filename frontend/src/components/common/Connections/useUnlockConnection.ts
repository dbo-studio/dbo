import api from '@/api';
import { formatPingFailureMessage, formatPingSuccessMessage } from '@/components/common/AddConnection/pingDiagnostics';
import locales from '@/locales';
import { isPasswordOptionalDriver } from '@/core/db/connectionAliases';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as v from 'valibot';

const formSchema = v.object({
  password: v.pipe(v.string(), v.minLength(1, 'Password is required')),
  rememberPassword: v.boolean()
});

/** The connection that is waiting for its password, and whether it is the one in use. */
export function useConnectionLock(): { lockedId: number | undefined; locked: boolean } {
  const show = useSettingStore((s) => s.ui.showConnectionPasswordPrompt);
  const lockedId = useSettingStore((s) => s.ui.passwordPromptConnectionId);
  const currentId = useConnectionStore((s) => s.currentConnectionId);

  return { lockedId, locked: show && lockedId != null && Number(lockedId) === Number(currentId) };
}

/** Password entry for a locked connection: test it, save it, clear the lock. Used inline and in the modal. */
export function useUnlockConnection(onUnlocked?: () => void | Promise<void>) {
  const connectionId = useSettingStore((s) => s.ui.passwordPromptConnectionId);
  const connections = useConnectionStore((s) => s.connections);
  const updateUI = useSettingStore((s) => s.updateUI);
  const queryClient = useQueryClient();

  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);

  const { mutateAsync: saveCredentials, isPending: saving } = useMutation({
    mutationFn: api.connection.setConnectionCredentials
  });
  const { mutateAsync: ping, isPending: testing } = useMutation({ mutationFn: api.connection.pingConnection });

  const connection = connections?.find((c) => c.id === connectionId);

  // Redis is often passwordless, so an empty password must be allowed to unlock it.
  const passwordOptional = isPasswordOptionalDriver(connection?.type);
  const errors = useMemo(() => {
    if (passwordOptional) return [];
    const result = v.safeParse(formSchema, { password, rememberPassword });
    return result.success ? [] : result.issues.map((i) => i.message);
  }, [password, rememberPassword, passwordOptional]);

  const pingWithPassword = async () => {
    if (!connection || !connectionId) return null;

    return ping({ id: connectionId, type: connection.type, options: { ...connection.options, password } });
  };

  const reset = (): void => {
    setPassword('');
    setRememberPassword(false);
  };

  const close = (): void => {
    reset();
    updateUI({ showConnectionPasswordPrompt: false, passwordPromptConnectionId: undefined });
  };

  const submit = async (): Promise<void> => {
    if (!connectionId) return;

    try {
      await pingWithPassword();
      await saveCredentials({ id: connectionId, password, rememberPassword: rememberPassword || password === '' });
      reset();
      updateUI({ showConnectionPasswordPrompt: false, passwordPromptConnectionId: undefined });
      await onUnlocked?.();
      await queryClient.invalidateQueries({ queryKey: ['connections'] });
    } catch (error) {
      const message = formatPingFailureMessage(error);
      if (message) toast.error(message);
    }
  };

  const test = async (): Promise<void> => {
    try {
      const diagnostics = await pingWithPassword();
      if (diagnostics)
        toast.success(locales.connection_test_success, { description: formatPingSuccessMessage(diagnostics) });
    } catch (error) {
      const message = formatPingFailureMessage(error);
      if (message) toast.error(message);
    }
  };

  return {
    connection,
    connectionId,
    password,
    setPassword,
    rememberPassword,
    setRememberPassword,
    errors,
    pending: saving || testing,
    testing,
    submit,
    test,
    close
  };
}
