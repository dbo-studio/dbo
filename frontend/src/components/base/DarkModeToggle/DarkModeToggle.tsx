import { useSettingStore } from '@/store/settingStore/setting.store';
import { IconButton } from '@mui/material';
import { type JSX, useEffect } from 'react';
import CustomIcon from '../CustomIcon/CustomIcon';

export default function DarkModeToggle(): JSX.Element {
  const isDark = useSettingStore((state) => state.isDark);
  const toggleIsDark = useSettingStore((state) => state.toggleIsDark);

  useEffect(() => {
    if (isDark === undefined) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.matches) {
        toggleIsDark(true);
      }
      mq.addEventListener('change', (evt) => toggleIsDark(evt.matches));
    }
  }, []);

  const handleToggle = (): void => {
    toggleIsDark(undefined);
  };

  return (
    <IconButton onClick={handleToggle} aria-label='user'>
      <CustomIcon type={isDark ? 'light' : 'dark'} size={'m'} />
    </IconButton>
  );
}
