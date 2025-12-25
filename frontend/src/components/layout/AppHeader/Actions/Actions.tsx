import { constants } from '@/core/constants';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { IconButton, Stack, Tooltip } from '@mui/material';
import type { JSX } from 'react';
import CustomIcon from '../../../base/CustomIcon/CustomIcon.tsx';
import locales from '@/locales/index.ts';

export default function Actions(): JSX.Element {
  const updateUI = useSettingStore((state) => state.updateUI);

  const handelUpdateSidebar = (direction: 'right' | 'left'): void => {
    const sidebar = useSettingStore.getState().ui.sidebar;
    if (direction === 'right') {
      if (!sidebar.showRight) {
        updateUI({ sidebar: { ...sidebar, showRight: !sidebar.showRight, rightWidth: constants.defaultSidebarWidth } });
      } else {
        updateUI({ sidebar: { ...sidebar, showRight: !sidebar.showRight } });
      }
    }

    if (direction === 'left') {
      if (!sidebar.showLeft) {
        updateUI({ sidebar: { ...sidebar, showLeft: !sidebar.showLeft, leftWidth: constants.defaultSidebarWidth } });
      } else {
        updateUI({ sidebar: { ...sidebar, showLeft: !sidebar.showLeft } });
      }
    }
  };

  return (
    <Stack direction='row' justifyContent='flex-end'>
      <Tooltip title={locales.left_sidebar}>
        <IconButton aria-label='sideLeft' onClick={(): void => handelUpdateSidebar('left')}>
          <CustomIcon type={'sideLeft'} size={'m'} />
        </IconButton>
      </Tooltip>
      <Tooltip title={locales.right_sidebar}>
        <IconButton aria-label='sideRight' onClick={(): void => handelUpdateSidebar('right')}>
          <CustomIcon type={'sideRight'} size={'m'} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
