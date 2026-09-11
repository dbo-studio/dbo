import { Box } from '@mui/material';
import type { JSX } from 'react';
import { AccountPasswordSettings } from './AccountPasswordSettings/AccountPasswordSettings';
import { SafeModeSettings } from './SafeModeSettings/SafeModeSettings';
import { TotpSettings } from './TotpSettings/TotpSettings';

export default function SecurityPanel(): JSX.Element {
  return (
    <Box>
      <AccountPasswordSettings />
      <TotpSettings />
      <SafeModeSettings />
    </Box>
  );
}
