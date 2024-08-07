import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { IconButton } from '@mui/material';
import { useEffect } from 'react';
import CustomIcon from '../CustomIcon/CustomIcon';

export default function DarkModeToggle() {
  const { isDark, updateIsDark } = useSettingStore();
  const showModal = useConfirmModalStore((state) => state.success);

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
    showModal(locales.restart_required, locales.dark_mode_restart, () => {
      updateIsDark(undefined);
      window.location.reload();
    });
  };

  return (
    <IconButton onClick={handleToggle} aria-label='user'>
      <CustomIcon type={isDark ? 'dark' : 'light'} size={'m'} />
    </IconButton>
  );
}
