import { constants } from '@/src/core/constants';
import { useSettingStore } from '@/src/store/settingStore/setting.store';
import { IconButton, Stack } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';

export default function Actions() {
  const { updateSidebar, sidebar } = useSettingStore();

  const handelUpdateSidebar = (direction: 'right' | 'left') => {
    if (direction == 'right') {
      if (!sidebar.showRight) {
        updateSidebar({ showRight: !sidebar.showRight, rightWidth: constants.defaultSidebarWidth });
      } else {
        updateSidebar({ showRight: !sidebar.showRight });
      }
    }

    if (direction == 'left') {
      if (!sidebar.showLeft) {
        updateSidebar({ showLeft: !sidebar.showLeft, leftWidth: constants.defaultSidebarWidth });
      } else {
        updateSidebar({ showLeft: !sidebar.showLeft });
      }
    }
  };

  return (
    <Stack direction='row' justifyContent='flex-end'>
      <IconButton aria-label='sideLeft' onClick={() => handelUpdateSidebar('left')}>
        <CustomIcon type={'sideLeft'} size={'m'} />
      </IconButton>
      {/* <IconButton aria-label='sideBottom'>
        <CustomIcon type={'sideBottom'} size={'m'} />
      </IconButton> */}
      <IconButton aria-label='sideRight' onClick={() => handelUpdateSidebar('right')}>
        <CustomIcon type={'sideRight'} size={'m'} />
      </IconButton>
    </Stack>
  );
}
