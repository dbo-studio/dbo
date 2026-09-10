import { Box } from '@mui/material';
import type { JSX } from 'react';
import { SettingGroup } from '../SettingRow/SettingRow';
import { Analytics } from './Analytics/Analytics';
import { AuthSessionSettings } from './AuthSessionSettings/AuthSessionSettings';
import { CheckUpdate } from './CheckUpdate/CheckUpdate';
import { DebugMode } from './DebugMode/DebugMode';
import { ResetFactory } from './ResetFactory/ResetFactory';
import { ShowLogs } from './ShowLogs/ShowLogs';

export default function GeneralPanel(): JSX.Element {
  return (
    <Box>
      <SettingGroup>
        <AuthSessionSettings />
        <CheckUpdate />
        <Analytics />
        <DebugMode />
        <ShowLogs />
        <ResetFactory />
      </SettingGroup>
    </Box>
  );
}
