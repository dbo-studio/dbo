import EmptyState from '@/components/base/EmptyState/EmptyState';
import { PERM } from '@/core/auth/permissions';
import { useSelectedTab } from '@/hooks';
import { useCan } from '@/hooks/useFeaturePermissions';
import locales from '@/locales';
import type { BackupSection, BackupTabType } from '@/types';
import { Typography } from '@mui/material';
import { type JSX, type ReactNode } from 'react';
import { BackupContentInnerStyled, BackupContentPaneStyled, BackupRootStyled } from './BackupPanel.styled';
import BackupsSection from './sections/BackupsSection/BackupsSection';
import RestoreSection from './sections/RestoreSection';
import SchedulesSection from './sections/SchedulesSection';

type Page = { label: string; description: string; content: ReactNode; perm: string };

/** One page of Backup. Which page is open is chosen in the sidebar (BackupSidebar), not here. */
export default function BackupPanel(): JSX.Element {
  const tab = useSelectedTab() as BackupTabType;
  const can = useCan();

  const pages: Record<BackupSection, Page> = {
    backups: {
      label: locales.backup_nav_backups,
      description: locales.backup_not_export,
      content: <BackupsSection tab={tab} />,
      perm: PERM.backupCreate
    },
    restore: {
      label: locales.backup_nav_restore,
      description: locales.backup_nav_restore_hint,
      content: <RestoreSection />,
      perm: PERM.backupRestore
    },
    schedules: {
      label: locales.backup_jobs,
      description: locales.backup_nav_schedules_hint,
      content: <SchedulesSection tab={tab} />,
      perm: PERM.backupCreate
    }
  };
  // A page the user may not use gives way to the first one they may.
  const requested = pages[tab.section] ?? pages.backups;
  const page = can(requested.perm) ? requested : Object.values(pages).find((p) => can(p.perm));

  if (!page) {
    return <EmptyState icon='backup' title={locales.no_permission} />;
  }

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
