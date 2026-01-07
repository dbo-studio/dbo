import SelectInput from '@/components/base/SelectInput/SelectInput';
import { SelectInputOption } from '@/components/base/SelectInput/types';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Divider, FormControl, Typography } from '@mui/material';
import { type JSX } from 'react';
import { FontPreviewBoxStyled } from './Font.styled';

const fonts = [
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
  { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono' }
];

export default function Font(): JSX.Element {
  const theme = useSettingStore((state) => state.theme);
  const updateTheme = useSettingStore((state) => state.updateTheme);

  return (
    <Box>
      <Box mb={1} mt={3}>
        <Typography variant='body1'>{locales.application_font}</Typography>
      </Box>
      <Divider />
      <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
        <SelectInput
          value={theme.appFont}
          options={fonts}
          onChange={(value): void => updateTheme({ appFont: (value as SelectInputOption)?.value as string })}
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
