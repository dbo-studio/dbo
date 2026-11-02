import { useSettingStore } from '@/store/settingStore/setting.store';
import { useEffect } from 'react';

/** The analytics switch. It also tells the analytics script, which reads a localStorage flag. */
export const useAnalyticsSetting = (): [boolean, (enabled: boolean) => void] => {
  const enabled = useSettingStore((state) => state.general.enableAnalytics);
  const updateGeneral = useSettingStore((state) => state.updateGeneral);

  useEffect(() => {
    if (enabled) {
      localStorage.removeItem('umami.disabled');
    } else {
      localStorage.setItem('umami.disabled', '1');
    }
  }, [enabled]);

  return [enabled, (next): void => updateGeneral({ enableAnalytics: next })];
};
