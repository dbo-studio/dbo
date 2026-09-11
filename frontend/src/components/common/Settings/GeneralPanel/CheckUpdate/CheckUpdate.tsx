import api from '@/api';
import { SettingRow } from '@/components/common/Settings/SettingRow/SettingRow';
import { tools } from '@/core/utils';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Button } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useState } from 'react';

export function CheckUpdate() {
  const general = useSettingStore((state) => state.general);
  const updateGeneral = useSettingStore((state) => state.updateGeneral);

  const [buttonText, setButtonText] = useState(general.release ? locales.update : locales.check);

  const { mutateAsync: checkUpdateMutation, isPending: isCheckUpdatePending } = useMutation({
    mutationFn: async () => await api.config.getCheckUpdate()
  });

  const handleCheckUpdate = async () => {
    try {
      const response = await checkUpdateMutation();
      if (response.name !== general.version) {
        setButtonText(locales.update);
        updateGeneral({ release: response });
      } else {
        setButtonText(locales.you_are_up_to_date);
      }
    } catch {
      /* ignored */
    }
  };

  const handleUpdate = async () => {
    if (await tools.isTauri()) {
      await openUrl(general.release?.url ?? '');
    } else {
      window.open(general.release?.url, '_blank');
    }
  };

  return (
    <SettingRow
      id='general.updates'
      label={
        general.release ? `${locales.new_version_available} : ${general.release?.name}` : locales.check_for_updates
      }
      control={
        !general.release ? (
          <Button
            loading={isCheckUpdatePending}
            loadingPosition='start'
            variant='outlined'
            size='small'
            onClick={() => void handleCheckUpdate()}
          >
            {buttonText}
          </Button>
        ) : (
          <Button variant='outlined' size='small' onClick={() => void handleUpdate()}>
            {buttonText}
          </Button>
        )
      }
    />
  );
}
