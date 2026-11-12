import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import type { BackupSection, BackupTabType } from '@/types';
import { Typography } from '@mui/material';
import { type JSX, type ReactNode } from 'react';
import { BackupContentInnerStyled, BackupContentPaneStyled, BackupRootStyled } from './BackupPanel.styled';
import BackupsSection from './sections/BackupsSection';
import RestoreSection from './sections/RestoreSection';
import SchedulesSection from './sections/SchedulesSection';
import ToolsSection from './sections/ToolsSection';

type Page = { label: string; description: string; content: ReactNode };

/** One page of Backup. Which page is open is chosen in the sidebar (BackupSidebar), not here. */
export default function BackupPanel(): JSX.Element {
  const tab = useSelectedTab() as BackupTabType;

  const pages: Record<BackupSection, Page> = {
    backups: {
      label: locales.backup_nav_backups,
      description: locales.backup_not_export,
      content: <BackupsSection tab={tab} />
    },
    restore: {
      label: locales.backup_nav_restore,
      description: locales.backup_nav_restore_hint,
      content: <RestoreSection />
    },
    schedules: {
      label: locales.backup_jobs,
      description: locales.backup_nav_schedules_hint,
      content: <SchedulesSection tab={tab} />
    },
    tools: { label: locales.backup_tools, description: locales.backup_tools_hint, content: <ToolsSection /> }
  };
  const page = pages[tab.section] ?? pages.backups;

  return (
    <BackupRootStyled data-testid='backup-panel'>
      <BackupContentPaneStyled>
        <BackupContentInnerStyled>
          <div>
            <Typography color='textTitle' variant='subtitle1' sx={{ fontWeight: 600 }}>
              {page.label}
            </Typography>
            <Typography color='textText' variant='body2'>
              {page.description}
            </Typography>
          </div>
          {page.content}
        </BackupContentInnerStyled>
      </BackupContentPaneStyled>
    </BackupRootStyled>
  );
}
