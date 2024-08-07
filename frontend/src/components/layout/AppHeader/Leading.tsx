import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { IconButton, Stack } from '@mui/material';
import { useEffect } from 'react';

export default function Leading() {
  const { isDark, updateIsDark } = useSettingStore();

  useEffect(() => {
    if (isDark === undefined) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.matches) {
        updateIsDark(true);
      }
      mq.addEventListener('change', (evt) => updateIsDark(evt.matches));
    }
  }, []);

  return (
    <Stack spacing={2} direction='row' justifyContent='flex-start'>
      <IconButton onClick={() => updateIsDark(undefined)} aria-label='user'>
        <CustomIcon type={isDark ? 'dark' : 'light'} size={'m'} />
      </IconButton>
      {/* <IconButton aria-label='settings'>
        <CustomIcon type={'settings'} size={'m'} />
      </IconButton> */}
    </Stack>
  );
}
