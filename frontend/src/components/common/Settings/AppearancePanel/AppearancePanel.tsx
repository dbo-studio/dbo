import { Box } from '@mui/material';
import { type JSX } from 'react';
import EditorTheme from './EditorTheme/EditorTheme';
import Font from './Font/Font';
import Theme from './Theme/Theme';

export default function AppearancePanel(): JSX.Element {
  return (
    <Box>
      <Theme />
      <Font />
      <EditorTheme />
    </Box>
  );
}
