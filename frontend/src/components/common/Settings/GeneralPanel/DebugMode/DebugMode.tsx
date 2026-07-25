import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Divider, Switch, Typography } from '@mui/material';
import { GeneralPanelSettingRowStyled } from '../GeneralPanel.styled';

export function DebugMode() {
  const debug = useSettingStore((state) => state.general.debug);
  const updateGeneral = useSettingStore((state) => state.updateGeneral);

  const handleChangeDebugMode = (event: React.ChangeEvent<HTMLInputElement>): void => {
    updateGeneral({ debug: event?.target?.checked });
  };

  return (
    <Box
      sx={{
        mt: 1
      }}
    >
      <GeneralPanelSettingRowStyled>
        <Box>
          <Typography color={'textTitle'} variant={'subtitle2'}>
            {locales.debug_mode}
          </Typography>
          <Typography color={'textText'} variant={'caption'}>
            {locales.enable_debug_console}
          </Typography>
        </Box>

        <Switch checked={debug} onChange={handleChangeDebugMode} />
      </GeneralPanelSettingRowStyled>
      <Divider />
    </Box>
  );
}
