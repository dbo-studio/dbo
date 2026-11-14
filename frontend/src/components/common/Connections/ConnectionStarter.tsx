import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { engineIconOf } from '@/components/layout/ConnectionSwitcher/ConnectionRow';
import { canCreateConnection } from '@/core/auth/permissions';
import { tools } from '@/core/utils';
import { useOpenDatabaseFile } from '@/hooks/useOpenDatabaseFile';
import { useSwitchConnection } from '@/hooks/useSwitchConnection';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Button, Stack, Typography } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';

const MAX_SHOWN_CONNECTIONS = 3;

/** What to do when no connection is active: add one, open a database file (desktop), or pick a saved one. */
export default function ConnectionStarter(): JSX.Element {
  const updateUI = useSettingStore((state) => state.updateUI);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canAddConnection = canCreateConnection(mode, user);
  const connections = useConnectionStore((s) => s.connections) ?? [];
  const { switchConnection, switchingId } = useSwitchConnection();
  const { pickDatabaseFile } = useOpenDatabaseFile();
  // Only the desktop app has native file paths; a browser cannot open a database file.
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    void tools.isTauri().then(setIsDesktop);
  }, []);

  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
      {canAddConnection && (
        <>
          <Stack direction='row' spacing={1}>
            <Button
              variant='contained'
              onClick={(): void => updateUI({ showAddConnection: true, duplicateConnectionId: undefined })}
            >
              {locales.new_connection}
            </Button>
            {isDesktop && (
              <Button variant='outlined' onClick={() => void pickDatabaseFile()} data-testid='open-database-file'>
                {locales.open_database_file}
              </Button>
            )}
          </Stack>
          {isDesktop && (
            <Typography variant='caption' color='textSubdued'>
              {locales.drop_database_hint}
            </Typography>
          )}
        </>
      )}
      {connections.length > 0 && (
        <Stack spacing={0.5} sx={{ mt: 1, width: 280, maxWidth: '100%' }} data-testid='empty-connections-list'>
          <Typography variant='caption' color='textSubdued'>
            {locales.your_connections}
          </Typography>
          {connections.slice(0, MAX_SHOWN_CONNECTIONS).map((connection) => (
            <Button
              key={connection.id}
              disabled={switchingId === connection.id}
              onClick={() => void switchConnection(connection)}
              startIcon={<CustomIcon type={engineIconOf(connection)} size='s' />}
              sx={{ justifyContent: 'flex-start' }}
            >
              {connection.name}
            </Button>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
