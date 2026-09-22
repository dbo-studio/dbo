import api from '@/api';
import { SettingRow } from '@/components/common/Settings/SettingRow/SettingRow';
import { tools } from '@/core/utils';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Button } from '@mui/material';
import { openPath } from '@tauri-apps/plugin-opener';

export function ShowLogs() {
  const general = useSettingStore((state) => state.general);

  const handleOpenLogs = async (): Promise<void> => {
    if (await tools.isTauri()) {
      await openPath(general.logsPath);
    } else {
      try {
        const blob = await api.config.getLogsPath();
        tools.fileDownload(blob, 'logs.txt');
      } catch {
        /* ignored */
      }
    }
  };

  return (
    <SettingRow
      id='general.logs'
      label={locales.show_logs}
      description={general.logsPath}
      control={
        <Button variant='outlined' size='small' onClick={() => void handleOpenLogs()}>
          {locales.open}
        </Button>
      }
    />
  );
}
