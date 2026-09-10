import { SettingRow } from '@/components/common/Settings/SettingRow/SettingRow';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Switch } from '@mui/material';

export function DebugMode() {
  const debug = useSettingStore((state) => state.general.debug);
  const updateGeneral = useSettingStore((state) => state.updateGeneral);

  const handleChangeDebugMode = (event: React.ChangeEvent<HTMLInputElement>): void => {
    updateGeneral({ debug: event?.target?.checked });
  };

  return (
    <SettingRow
      id='general.debug'
      label={locales.debug_mode}
      description={locales.enable_debug_console}
      control={<Switch checked={debug} onChange={handleChangeDebugMode} />}
    />
  );
}
