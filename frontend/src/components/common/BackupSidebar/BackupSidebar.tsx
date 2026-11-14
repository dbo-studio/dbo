import api from '@/api';
import type { BackupScheduleType } from '@/api/backup/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import {
  SidebarItemStyled,
  SidebarListStyled,
  SidebarSectionHeaderStyled
} from '@/components/base/SidebarList/SidebarList.styled';
import { openBackup } from '@/core/backup/openBackup';
import { TabMode } from '@/core/enums';
import locales from '@/locales';
import { selectTabs, useTabStore } from '@/store/tabStore/tab.store';
import type { BackupSection, BackupTabType } from '@/types';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX, type ReactNode, useState } from 'react';
import { ScheduleDotStyled } from './BackupSidebar.styled';

const dotTone = (s: BackupScheduleType): 'success' | 'error' | 'idle' =>
  !s.enabled || s.lastStatus === '' ? 'idle' : s.lastStatus === 'failed' ? 'error' : 'success';

function Section({
  title,
  count,
  action,
  children
}: {
  title: string;
  count?: number;
  action?: { label: string; testId: string; onClick: () => void };
  children: ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(true);

  return (
    <Box>
      <SidebarSectionHeaderStyled role='button' aria-expanded={open} onClick={() => setOpen(!open)}>
        <CustomIcon type={open ? 'chevronDown' : 'chevronRight'} size='xs' />
        <Typography variant='caption' sx={{ flex: 1, fontWeight: 600 }}>
          {count === undefined ? title : `${title} · ${count}`}
        </Typography>
        {action && (
          <Tooltip title={action.label}>
            <IconButton
              aria-label={action.label}
              data-testid={action.testId}
              onClick={(event) => {
                event.stopPropagation();
                action.onClick();
              }}
            >
              <CustomIcon type='plus' size='xs' />
            </IconButton>
          </Tooltip>
        )}
      </SidebarSectionHeaderStyled>
      {open && children}
    </Box>
  );
}

/**
 * The Backup area's list, in the same look as Boards: sections you can fold, 28px rows, live status
 * on the schedules. A click opens that page in the centre, so the page needs no navigation of its own.
 */
export default function BackupSidebar(): JSX.Element {
  const tab = useTabStore(selectTabs).find((t): t is BackupTabType => t.mode === TabMode.Backup);
  const { data: schedules = [] } = useQuery({ queryKey: ['backup-schedules'], queryFn: api.backup.schedules });
  const { data: destinations = [] } = useQuery({
    queryKey: ['backup-connectors', 'destination'],
    queryFn: () => api.backup.connectors('destination')
  });
  const { data: channels = [] } = useQuery({
    queryKey: ['backup-connectors', 'channel'],
    queryFn: () => api.backup.connectors('channel')
  });

  const section = tab?.section;

  const page = (id: BackupSection, label: string, icon: keyof typeof IconTypes, count?: number): JSX.Element => (
    <SidebarItemStyled
      key={id}
      tabIndex={0}
      role='button'
      selected={section === id && (id !== 'schedules' || tab?.scheduleId === undefined)}
      data-testid={`backup-nav-${id}`}
      onClick={() => openBackup({ section: id })}
      onKeyDown={(event) => event.key === 'Enter' && openBackup({ section: id })}
    >
      <CustomIcon type={icon} size='xs' />
      <Typography variant='body2' noWrap sx={{ flex: 1, minWidth: 0 }}>
        {label}
      </Typography>
      {count !== undefined && count > 0 && (
        <Typography variant='caption' color='textSubdued'>
          {count}
        </Typography>
      )}
    </SidebarItemStyled>
  );

  return (
    <SidebarListStyled>
      <Section title={locales.backup_sidebar_data}>
        {page('backups', locales.backup_nav_backups, 'backup')}
        {page('restore', locales.backup_nav_restore, 'undo')}
      </Section>

      <Section
        title={locales.backup_jobs}
        count={schedules.length}
        action={{
          label: locales.backup_job_new,
          testId: 'backup-sidebar-new-schedule',
          onClick: () => openBackup({ section: 'schedules', scheduleId: 'new' })
        }}
      >
        {page('schedules', locales.backup_sidebar_all_schedules, 'clock')}
        {schedules.map((s) => (
          <SidebarItemStyled
            key={s.id}
            tabIndex={0}
            role='button'
            selected={section === 'schedules' && tab?.scheduleId === s.id}
            data-testid={`backup-sidebar-schedule-${s.name}`}
            onClick={() => openBackup({ section: 'schedules', scheduleId: s.id })}
            onKeyDown={(event) => event.key === 'Enter' && openBackup({ section: 'schedules', scheduleId: s.id })}
          >
            <ScheduleDotStyled tone={dotTone(s)} />
            <Typography variant='body2' noWrap sx={{ flex: 1, minWidth: 0 }}>
              {s.name}
            </Typography>
            {!s.enabled && (
              <Typography variant='caption' color='textSubdued'>
                {locales.backup_schedule_paused}
              </Typography>
            )}
          </SidebarItemStyled>
        ))}
      </Section>

      <Section title={locales.backup_sidebar_setup}>
        {page('destinations', locales.backup_nav_destinations, 'cloud', destinations.length)}
        {page('notifications', locales.backup_nav_notifications, 'bell', channels.length)}
        {page('tools', locales.backup_tools, 'wrench')}
      </Section>
    </SidebarListStyled>
  );
}
