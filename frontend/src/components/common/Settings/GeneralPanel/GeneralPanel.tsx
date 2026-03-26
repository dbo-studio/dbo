import { Box } from '@mui/material';
import type { JSX } from 'react';
import { Analytics } from './Analytics/Analytics';
import { CheckUpdate } from './CheckUpdate/CheckUpdate';
import { DebugMode } from './DebugMode/DebugMode';
import { ResetFactory } from './ResetFactory/ResetFactory';
import { ShowLogs } from './ShowLogs/ShowLogs';

export default function GeneralPanel(): JSX.Element {
  return (
    <Box>
      <CheckUpdate />
      <Analytics />
      <DebugMode />
      <ShowLogs />
      <ResetFactory />
    </Box>
  );
}
