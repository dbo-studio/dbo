import api from '@/api';
import type { McpStatus } from '@/api/mcp';
import ProgressBar from '@/components/base/ProgressBar/ProgressBar';
import RunningJobs, { useRunningJobs } from '@/components/common/RunningJobs/RunningJobs';
import { canManageMcpSettings } from '@/core/auth/permissions';
import { openBackup } from '@/core/backup/openBackup';
import { TabMode } from '@/core/enums';
import { openSettings } from '@/core/settings/openSettings';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useFocusedDataStore } from '@/store/dataStore/data.store';
import { useNotificationPanelStore } from '@/store/notificationPanel/notificationPanel.store';
import { Popover, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import {
  StatusBarStyled,
  StatusDotStyled,
  StatusItemStyled,
  StatusSpacerStyled,
  StatusTextStyled
} from './StatusBar.styled';

const AI_SETTINGS_TAB = 3;

const mcpTone = (status: McpStatus | undefined): 'idle' | 'success' | 'warning' =>
  !status?.enabled ? 'idle' : status.healthy ? 'success' : 'warning';

const ago = (iso: string): string => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (minutes < 60) return rtf.format(-Math.max(minutes, 0), 'minute');
  if (minutes < 60 * 24) return rtf.format(-Math.round(minutes / 60), 'hour');
  return rtf.format(-Math.round(minutes / 60 / 24), 'day');
};

/** What the active tab has to say: result size for grids, the last run for Backup. */
function TabInfo(): JSX.Element | null {
  const tab = useSelectedTab();
  const rows = useFocusedDataStore((s) => s.rows?.length);
  const selected = useFocusedDataStore((s) => s.selectedRows.length);
  const { data: schedules = [] } = useQuery({ queryKey: ['backup-schedules'], queryFn: api.backup.schedules });

  if (tab?.mode === TabMode.Data || tab?.mode === TabMode.Query) {
    if (rows === undefined) return null;
    const parts = [locales.status_rows.replace('{n}', rows.toLocaleString())];
    if (selected > 0) parts.push(locales.status_selected.replace('{n}', String(selected)));

    return <StatusTextStyled data-testid='status-rows'>{parts.join(' · ')}</StatusTextStyled>;
  }

  if (tab?.mode === TabMode.Backup) {
    const latest = schedules
      .map((s) => s.lastSuccessAt)
      .filter((v): v is string => !!v)
      .sort()
      .at(-1);

    return (
      <StatusTextStyled data-testid='status-backup-last'>
        {latest ? locales.status_last_backup.replace('{when}', ago(latest)) : locales.status_no_backup}
      </StatusTextStyled>
    );
  }

  return null;
}

/**
 * Always-visible state in three zones: the connection (left), the active tab (centre), and the
 * app (right): jobs, backups, MCP, unread notifications.
 */
export default function StatusBar(): JSX.Element {
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canManageMcp = canManageMcpSettings(mode, user);
  const connection = useCurrentConnection();
  const loading = useConnectionStore((s) => s.loading);
  const running = useRunningJobs();
  const setPanelOpen = useNotificationPanelStore((s) => s.setOpen);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const { data: mcp } = useQuery({
    queryKey: ['mcp-status'],
    queryFn: api.mcp.getStatus,
    enabled: canManageMcp,
    refetchOnWindowFocus: true
  });
  const { data: schedules = [] } = useQuery({ queryKey: ['backup-schedules'], queryFn: api.backup.schedules });
  const { data: inbox } = useQuery({ queryKey: ['notifications'], queryFn: () => api.notification.list() });
  const failing = schedules.filter((s) => s.enabled && s.lastStatus === 'failed').length;
  const unread = inbox?.unread ?? 0;
  const first = running[0];
  const connectionTone =
    loading === 'loading' ? 'busy' : loading === 'error' ? 'error' : connection ? 'success' : 'idle';

  return (
    <StatusBarStyled data-testid='status-bar'>
      <StatusTextStyled data-testid='status-connection'>
        <StatusDotStyled tone={connectionTone} />
        <span>
          {loading === 'error'
            ? locales.connection_error
            : connection
              ? `${connection.name} · ${connection.info}`
              : locales.no_active_connection}
        </span>
      </StatusTextStyled>

      <StatusSpacerStyled />
      <TabInfo />
      <StatusSpacerStyled />

      <StatusItemStyled
        onClick={(event) => running.length > 0 && setAnchor(event.currentTarget)}
        data-testid='status-jobs'
        aria-label={locales.status_jobs}
      >
        <StatusDotStyled tone={running.length > 0 ? 'busy' : 'idle'} />
        {running.length > 0 ? (
          <>
            <span>
              {running.length === 1
                ? locales.status_job_running
                : locales.status_jobs_running.replace('{n}', String(running.length))}
            </span>
            <span style={{ width: 80 }}>
              <ProgressBar value={first?.status === 'pending' ? undefined : first?.progress} />
            </span>
          </>
        ) : (
          <span>{locales.status_idle}</span>
        )}
      </StatusItemStyled>

      <StatusItemStyled
        onClick={() => openBackup({ section: failing > 0 ? 'schedules' : 'backups' })}
        data-testid='status-backup'
      >
        <StatusDotStyled tone={failing > 0 ? 'error' : 'success'} />
        <span>
          {failing > 0 ? locales.status_backups_failing.replace('{n}', String(failing)) : locales.status_backups_ok}
        </span>
      </StatusItemStyled>

      {canManageMcp && (
        <StatusItemStyled
          onClick={() => openSettings({ section: AI_SETTINGS_TAB, aiTab: 'mcp' })}
          data-testid='status-mcp'
          aria-label='mcp-status'
        >
          <StatusDotStyled tone={mcpTone(mcp)} />
          <span>MCP</span>
        </StatusItemStyled>
      )}

      {unread > 0 && (
        <StatusItemStyled onClick={() => setPanelOpen(true)} data-testid='status-unread'>
          <StatusDotStyled tone='busy' />
          <span>{locales.status_unread.replace('{n}', String(unread))}</span>
        </StatusItemStyled>
      )}

      <Popover
        open={!!anchor && running.length > 0}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 340, mb: 0.5, backgroundImage: 'none' } } }}
      >
        <Typography variant='subtitle2' color='textTitle' sx={{ px: 1.5, pt: 1.25 }}>
          {locales.status_jobs}
        </Typography>
        <RunningJobs jobs={running} />
      </Popover>
    </StatusBarStyled>
  );
}
