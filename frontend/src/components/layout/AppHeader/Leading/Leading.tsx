import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { constants } from '@/core/constants';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { IconButton, Stack, Tooltip } from '@mui/material';
import type { JSX } from 'react';

export default function Leading(): JSX.Element {
  const updateUI = useSettingStore((state) => state.updateUI);

  const handelUpdateSidebar = (): void => {
    const sidebar = useSettingStore.getState().ui.sidebar;
    if (!sidebar.showLeft) {
      updateUI({ sidebar: { ...sidebar, showLeft: !sidebar.showLeft, leftWidth: constants.defaultSidebarWidth } });
    } else {
      updateUI({ sidebar: { ...sidebar, showLeft: !sidebar.showLeft } });
    }
  };

  return (
    <Stack
      spacing={2}
      direction='row'
      sx={{
        justifyContent: 'flex-start'
      }}
    >
      <Tooltip title={locales.left_sidebar}>
        <IconButton aria-label='sideLeft' onClick={(): void => handelUpdateSidebar()}>
          <CustomIcon type={'sideLeft'} size={'m'} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
