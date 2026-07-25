import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { constants } from '@/core/constants';
import locales from '@/locales/index.ts';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { Badge, IconButton, Stack, Tooltip } from '@mui/material';
import type { JSX } from 'react';
import McpStatusButton from './McpStatusButton';

export default function Actions(): JSX.Element {
  const updateUI = useSettingStore((state) => state.updateUI);
  const release = useSettingStore((state) => state.general.release);

  const handelUpdateSidebar = (): void => {
    const sidebar = useSettingStore.getState().ui.sidebar;
    if (!sidebar.showRight) {
      updateUI({ sidebar: { ...sidebar, showRight: !sidebar.showRight, rightWidth: constants.defaultSidebarWidth } });
    } else {
      updateUI({ sidebar: { ...sidebar, showRight: !sidebar.showRight } });
    }
  };

  const openSettings = (): void => {
    useSettingStore.getState().updateUI({ showSettings: { open: true, tab: 0 } });
  };

  return (
    <Stack
      direction='row'
      sx={{
        justifyContent: 'flex-end'
      }}
    >
      <McpStatusButton />
      {release ? (
        <Tooltip title={locales.new_version_available}>
          <IconButton aria-label='settings' onClick={openSettings}>
            <Badge variant='dot' color='warning'>
              <CustomIcon type={'settings'} size={'m'} />
            </Badge>
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title={locales.settings}>
          <IconButton aria-label='settings' onClick={openSettings}>
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
