import { SettingRow } from '@/components/common/Settings/SettingRow/SettingRow';
import { useAnalyticsSetting } from '@/hooks/useAnalyticsSetting';
import locales from '@/locales';
import { Switch } from '@mui/material';

export function Analytics() {
  const [enableAnalytics, setEnableAnalytics] = useAnalyticsSetting();

  return (
    <SettingRow
      id='general.analytics'
      label={locales.analytics}
      description={locales.enable_analytics}
      control={
        <Switch checked={enableAnalytics} onChange={(event): void => setEnableAnalytics(event.target.checked)} />
      }
    />
  );
}
