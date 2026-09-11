import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { canCreateConnection } from '@/core/auth/permissions';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Button, Typography } from '@mui/material';
import type { JSX } from 'react';
import { EmptyConnectionsStyled } from './Connections.styled';

export default function ConnectionsEmptyState(): JSX.Element {
  const updateUI = useSettingStore((state) => state.updateUI);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canAddConnection = canCreateConnection(mode, user);

  return (
    <EmptyConnectionsStyled>
      <CustomIcon type='connection' size='l' />
      <Typography variant='h6' color='textTitle' sx={{ textAlign: 'center' }}>
        {locales.no_active_connection}
      </Typography>
      <Typography variant='body2' color='textText' sx={{ textAlign: 'center' }}>
        {locales.connections_empty_hint}
      </Typography>
      {canAddConnection ? (
        <Button
          variant='contained'
          onClick={(): void => updateUI({ showAddConnection: true, duplicateConnectionId: undefined })}
        >
          {locales.new_connection}
        </Button>
      ) : null}
    </EmptyConnectionsStyled>
  );
}
