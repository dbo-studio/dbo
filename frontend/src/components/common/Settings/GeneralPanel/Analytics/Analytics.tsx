import { SettingRow } from '@/components/common/Settings/SettingRow/SettingRow';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Switch } from '@mui/material';
import { useEffect } from 'react';

export function Analytics() {
  const enableAnalytics = useSettingStore((state) => state.general.enableAnalytics);
  const updateGeneral = useSettingStore((state) => state.updateGeneral);

  useEffect(() => {
    if (enableAnalytics) {
      localStorage.removeItem('umami.disabled');
    } else {
      localStorage.setItem('umami.disabled', '1');
    }
  }, [enableAnalytics]);

  const handleChangeAnalytics = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const isEnabled = event?.target?.checked;
    updateGeneral({ enableAnalytics: isEnabled });
  };

  return (
    <SettingRow
      id='general.analytics'
      label={locales.analytics}
      description={locales.enable_analytics}
      control={<Switch checked={enableAnalytics} onChange={handleChangeAnalytics} />}
    />
  );
}
