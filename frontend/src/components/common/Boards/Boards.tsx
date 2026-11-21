import api from '@/api';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import Search from '@/components/base/Search/Search';
import { PERM } from '@/core/auth/permissions';
import { useContextMenu, useCurrentConnection } from '@/hooks';
import { useCan, useCanReports } from '@/hooks/useFeaturePermissions';
import locales from '@/locales';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX, type MouseEvent, useState } from 'react';
import { BoardsListStyled } from './Boards.styled';
import BoardsSection from './BoardsSection/BoardsSection';
import { type DashboardCommand, useDashboardCommands } from './useDashboardCommands';

type Item = { id: number; name: string };
type Kind = 'dashboard' | 'report';

/** The connection's saved dashboards and reports, in the sidebar next to saved queries. */
export default function Boards(): JSX.Element {
  const connection = useCurrentConnection();
  const connectionId = connection?.id;
  const can = useCan();
  const canDashboards = can(PERM.boardsDashboards);
  const canReports = useCanReports();
  const run = useDashboardCommands();
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState<MenuType[]>([]);
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const dashboards = useQuery({
    queryKey: ['dashboards', connectionId],
    queryFn: () => api.dashboard.getDashboards(Number(connectionId)),
    enabled: !!connectionId && canDashboards
  });
  const reports = useQuery({
    queryKey: ['questions', connectionId],
    queryFn: () => api.question.getQuestions(Number(connectionId)),
    enabled: !!connectionId && canReports
  });

  const refresh = (): void => {
    if (canDashboards) void dashboards.refetch();
    if (canReports) void reports.refetch();
  };

  const command = (name: DashboardCommand, item?: Item, kind?: Kind) => (): void =>
    void run(
      name,
      item &&
        (kind === 'dashboard' ? { dashboardId: item.id, name: item.name } : { questionId: item.id, name: item.name })
    );

  const itemMenu = (kind: Kind, item: Item): MenuType[] =>
    kind === 'dashboard'
      ? [
          { name: locales.dashboard_open, icon: 'layout', action: command('openDashboard', item, kind) },
          { name: locales.dashboard_rename, icon: 'pen', action: command('renameDashboard', item, kind) },
          { name: locales.dashboard_duplicate, icon: 'copy', action: command('duplicateDashboard', item, kind) },
          {
            name: locales.dashboard_delete,
            icon: 'delete',
            destructive: true,
            action: command('deleteDashboard', item, kind)
          }
        ]
      : [
          { name: locales.question_open, icon: 'chart', action: command('openReport', item, kind) },
          {
            name: locales.question_delete,
            icon: 'delete',
            destructive: true,
            action: command('deleteReport', item, kind)
          }
        ];

  const openMenu = (event: MouseEvent, items: MenuType[]): void => {
    event.stopPropagation();
    setMenu(items.map((item) => ({ ...item, closeBeforeAction: true })));
    handleContextMenu(event);
  };

  const filter = (items: Item[] | undefined): Item[] =>
    (items ?? []).filter((item) => item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));

  return (
    <Stack sx={{ mt: 1, minHeight: 0, flex: 1 }} data-testid='boards-view'>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
        <Box sx={{ flex: 1 }}>
          <Search onChange={setSearch} />
        </Box>
        <IconButton aria-label={locales.refresh} onClick={refresh}>
          <CustomIcon type='refresh' />
        </IconButton>
      </Stack>

      <BoardsListStyled>
        {(canDashboards && dashboards.isPending) || (canReports && reports.isPending) ? (
          <LinearProgress sx={{ mt: 1 }} />
        ) : (
          <>
            {canDashboards && (
              <BoardsSection
                kind='dashboard'
                title={locales.dashboards}
                icon='layout'
                items={filter(dashboards.data)}
                actions={[
                  {
                    label: locales.dashboard_new,
                    icon: 'plus',
                    testId: 'boards-new-dashboard',
                    onClick: command('newDashboard')
                  },
                  {
                    label: locales.dashboard_import,
                    icon: 'import',
                    testId: 'boards-import-dashboard',
                    onClick: command('importDashboard')
                  }
                ]}
                onOpen={(item) => command('openDashboard', item, 'dashboard')()}
                onMenu={(event, item) => openMenu(event, itemMenu('dashboard', item))}
              />
            )}
            {canReports && (
              <BoardsSection
                kind='report'
                title={locales.reports}
                icon='chart'
                items={filter(reports.data)}
                actions={[
                  {
                    label: locales.question_new,
                    icon: 'plus',
                    testId: 'boards-new-report',
                    onClick: command('newReport')
                  }
                ]}
                onOpen={(item) => command('openReport', item, 'report')()}
                onMenu={(event, item) => openMenu(event, itemMenu('report', item))}
              />
            )}
          </>
        )}
      </BoardsListStyled>

      <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </Stack>
  );
}

