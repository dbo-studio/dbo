import CustomIcon from '@/components/base/CustomIcon/CustomIcon.tsx';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Badge, IconButton, Stack, Tooltip } from '@mui/material';
import type { JSX } from 'react';

export default function Leading(): JSX.Element {
  const release = useSettingStore((state) => state.general.release);

  const openSettings = (): void => {
    useSettingStore.getState().toggleShowSettings(true);
  };

  return (
    <Stack spacing={2} direction='row' justifyContent='flex-start'>
      {
        release ? (
          <Tooltip title={locales.new_version_available}>
            <IconButton aria-label='settings' onClick={openSettings}>
              <Badge variant='dot' color='warning'>
                <CustomIcon type={'settings'} size={'m'} />
              </Badge>
            </IconButton>
          </Tooltip>
        ) :
          (
            <Tooltip title={locales.settings}>
              <IconButton aria-label='settings' onClick={openSettings}>
                <CustomIcon type={'settings'} size={'m'} />
              </IconButton>
            </Tooltip>
          )
      }
    </Stack>
  );
}
