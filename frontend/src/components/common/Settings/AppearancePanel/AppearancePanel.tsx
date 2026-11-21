import { Box } from '@mui/material';
import type { JSX } from 'react';
import AppearancePreview from './AppearancePreview/AppearancePreview';
import EditorTheme from './EditorTheme/EditorTheme';
import Font from './Font/Font';
import Theme from './Theme/Theme';

export default function AppearancePanel(): JSX.Element {
  return (
    <Box>
      <AppearancePreview />
      <Box data-settings-id='appearance.theme' sx={{ mb: 2 }}>
        <Theme />
      </Box>
      <Box data-settings-id='appearance.font' sx={{ mb: 2 }}>
        <Font />
      </Box>
      <Box data-settings-id='appearance.editor'>
        <EditorTheme />
      </Box>
    </Box>
  );
}
