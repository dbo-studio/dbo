import { Box } from '@mui/material';
import type { JSX } from 'react';
import { SafeModeSettings } from './SafeModeSettings/SafeModeSettings';

export default function SecurityPanel(): JSX.Element {
  return (
    <Box>
      <SafeModeSettings />
    </Box>
  );
}
