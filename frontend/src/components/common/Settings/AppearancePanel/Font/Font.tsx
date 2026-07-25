import SelectInput from '@/components/base/SelectInput/SelectInput';
import { SelectInputOption } from '@/components/base/SelectInput/types';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Divider, FormControl, Typography } from '@mui/material';
import { type JSX } from 'react';
import { FontPreviewBoxStyled } from './Font.styled';

const fonts = [
  { value: '"Roboto", "Tahoma", "Noto Sans Arabic", sans-serif', label: 'Roboto' },
  { value: '"Arial", "Tahoma", "Noto Sans Arabic", sans-serif', label: 'Arial' },
  { value: '"Helvetica", "Tahoma", "Noto Sans Arabic", sans-serif', label: 'Helvetica' },
  { value: '"Times New Roman", "Tahoma", "Noto Sans Arabic", sans-serif', label: 'Times New Roman' },
  { value: '"Georgia", "Tahoma", "Noto Sans Arabic", sans-serif', label: 'Georgia' },
  { value: '"Verdana", "Tahoma", "Noto Sans Arabic", sans-serif', label: 'Verdana' },
  { value: '"Courier New", "Tahoma", "Noto Sans Arabic", sans-serif', label: 'Courier New' },
  { value: '"JetBrains Mono", monospace, "Noto Sans Arabic", sans-serif', label: 'JetBrains Mono' }
];

export default function Font(): JSX.Element {
  const theme = useSettingStore((state) => state.theme);
  const updateTheme = useSettingStore((state) => state.updateTheme);

  const handleChangeFont = (value: string) => {
    updateTheme({ appFont: value });
  };

  return (
    <Box>
      <Box
        sx={{
          mb: 1,
          mt: 3
        }}
      >
        <Typography variant='body1'>{locales.application_font}</Typography>
      </Box>
      <Divider />
      <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
        <SelectInput
          value={theme.appFont}
          options={fonts}
          onChange={(value): void => handleChangeFont((value as SelectInputOption)?.value as string)}
        />
      </FormControl>
      <FontPreviewBoxStyled>
        <Typography variant='body2' color='textText' sx={{ fontFamily: theme.appFont }}>
          {locales.application_font_preview}
        </Typography>
      </FontPreviewBoxStyled>
    </Box>
  );
}
