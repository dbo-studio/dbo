import { useSettingStore } from '@/store/settingStore/setting.store';
import { IconButton } from '@mui/material';
import { useEffect } from 'react';
import CustomIcon from '../CustomIcon/CustomIcon';

export default function DarkModeToggle() {
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

  const handleToggle = () => {
    updateIsDark(undefined);
  };

  return (
    <IconButton onClick={handleToggle} aria-label='user'>
      <CustomIcon type={isDark ? 'light' : 'dark'} size={'m'} />
    </IconButton>
  );
}
