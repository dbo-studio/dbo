import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { constants } from '@/core/constants';
import { openSettings } from '@/core/settings/openSettings';
import locales from '@/locales/index.ts';
import { useBackupModalStore } from '@/store/backupModal/backup.store';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { Badge, IconButton, Stack, Tooltip } from '@mui/material';
import type { JSX } from 'react';
import NotificationBell from '../NotificationBell/NotificationBell';
import McpStatusButton from './McpStatusButton';

export default function Actions(): JSX.Element {
  const updateUI = useSettingStore((state) => state.updateUI);
  const openBackupConsole = useBackupModalStore((state) => state.openConsole);
  const release = useSettingStore((state) => state.general.release);

  const handelUpdateSidebar = (): void => {
    const sidebar = useSettingStore.getState().ui.sidebar;
    if (!sidebar.showRight) {
      updateUI({ sidebar: { ...sidebar, showRight: !sidebar.showRight, rightWidth: constants.defaultSidebarWidth } });
    } else {
      updateUI({ sidebar: { ...sidebar, showRight: !sidebar.showRight } });
    }
  };

  return (
    <Stack
      direction='row'
      sx={{
        justifyContent: 'flex-end'
      }}
    >
      <NotificationBell />
      <McpStatusButton />
      <Tooltip title={locales.backup_console}>
        <IconButton aria-label='backup-console' data-testid='backup-console-open' onClick={openBackupConsole}>
          <CustomIcon type={'database'} size={'m'} />
        </IconButton>
      </Tooltip>
      {release ? (
        <Tooltip title={locales.new_version_available}>
          <IconButton aria-label='settings' onClick={(): void => openSettings({ section: 0 })}>
            <Badge variant='dot' color='warning'>
              <CustomIcon type={'settings'} size={'m'} />
            </Badge>
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title={locales.settings}>
          <IconButton aria-label='settings' onClick={(): void => openSettings({ section: 0 })}>
            <CustomIcon type={'settings'} size={'m'} />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title={locales.right_sidebar}>
        <IconButton aria-label='sideRight' onClick={handelUpdateSidebar}>
          <CustomIcon type={'sideRight'} size={'m'} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
