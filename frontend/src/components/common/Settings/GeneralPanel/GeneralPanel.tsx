import { isInstanceAdmin } from '@/core/auth/permissions';
import { useAuthStore } from '@/store/authStore/auth.store';
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
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const showInstanceAdminTools = isInstanceAdmin(mode, user);

  return (
    <Box>
      <SettingGroup>
        <AuthSessionSettings />
        <CheckUpdate />
        <Analytics />
        <DebugMode />
        {showInstanceAdminTools ? <ShowLogs /> : null}
        {showInstanceAdminTools ? <ResetFactory /> : null}
      </SettingGroup>
    </Box>
  );
}
