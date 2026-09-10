import api from '@/api';
import { SettingRow } from '@/components/common/Settings/SettingRow/SettingRow';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { Button } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';

export function AuthSessionSettings(): JSX.Element | null {
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();
  const show = mode === 'local';

  const { mutateAsync, isPending } = useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => {
      clear();
      queryClient.clear();
    }
  });

  if (!show) {
    return null;
  }

  return (
    <SettingRow
      id='general.session'
      label={locales.auth_session}
      description={user?.email ? `${user.email} (${user.role})` : locales.auth_session}
      control={
        <Button
          variant='outlined'
          size='small'
          disabled={isPending}
          onClick={(): void => {
            void mutateAsync();
          }}
        >
          {locales.auth_logout}
        </Button>
      }
    />
  );
}
