import locales from '@/locales';
import { Box, Typography } from '@mui/material';
import { type JSX } from 'react';
import EditorTheme from './EditorTheme/EditorTheme';
import Font from './Font/Font';
import Theme from './Theme/Theme';

export default function AppearancePanel(): JSX.Element {
  return (
    <Box>
      <Box mb={1}>
        <Typography color='textTitle' variant='h6'>
          {locales.appearance}
        </Typography>
        <Typography color='textText' variant='body2'>
          {locales.appearance_description}
        </Typography>
      </Box>

      <Theme />
      <Font />
      <EditorTheme />
    </Box>
  );
}
