import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { IconButton, Stack } from '@mui/material';
import type { JSX } from 'react';

export default function Leading(): JSX.Element {
  const openSettings = (): void => {
    useSettingStore.getState().toggleShowSettings(true);
  };

  return (
    <Stack spacing={2} direction='row' justifyContent='flex-start'>
      <IconButton aria-label='settings' onClick={openSettings}>
        <CustomIcon type={'settings'} size={'m'} />
      </IconButton>
    </Stack>
  );
}
