import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Divider, Switch, Typography } from '@mui/material';
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
    <Box mt={1}>
      <Box display={'flex'} mb={1} flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'}>
        <Box>
          <Typography color={'textTitle'} variant={'subtitle2'}>
            {locales.analytics}
          </Typography>
          <Typography color={'textText'} variant={'caption'}>
            {locales.enable_analytics}
          </Typography>
        </Box>

        <Switch checked={enableAnalytics} onChange={handleChangeAnalytics} />
      </Box>
      <Divider />
    </Box>
  );
}
