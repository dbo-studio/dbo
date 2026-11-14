import api from '@/api';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconProps } from '@/components/base/CustomIcon/types';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import Search from '@/components/base/Search/Search';
import { isNoSQLType } from '@/core/db/connectionAliases';
import { useContextMenu, useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import { Box, IconButton, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX, type MouseEvent, useState } from 'react';
import { BoardsItemStyled, BoardsListStyled, BoardsSectionHeaderStyled } from './Boards.styled';
import { type DashboardCommand, useDashboardCommands } from './useDashboardCommands';

type Item = { id: number; name: string };
type Kind = 'dashboard' | 'report';

/** The connection's saved dashboards and reports, in the sidebar next to saved queries. */
export default function Boards(): JSX.Element {
  const connection = useCurrentConnection();
  const connectionId = connection?.id;
  const run = useDashboardCommands();
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState<MenuType[]>([]);
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  // Reports are SQL, which a key-value or document connection cannot run.
  const sqlOnly = !isNoSQLType(connection?.type);
  const dashboards = useQuery({
    queryKey: ['dashboards', connectionId],
    queryFn: () => api.dashboard.getDashboards(Number(connectionId)),
    enabled: !!connectionId && sqlOnly
  });
  const reports = useQuery({
    queryKey: ['questions', connectionId],
    queryFn: () => api.question.getQuestions(Number(connectionId)),
    enabled: !!connectionId && sqlOnly
  });

  const refresh = (): void => {
    void dashboards.refetch();
    void reports.refetch();
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

  if (!sqlOnly) return <EmptyState title={locales.boards_nosql_unsupported} />;

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
        {dashboards.isPending || reports.isPending ? (
          <LinearProgress sx={{ mt: 1 }} />
        ) : (
          <>
            <Section
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
            <Section
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
          </>
        )}
      </BoardsListStyled>

      <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </Stack>
  );
}

type SectionAction = { label: string; icon: IconProps['type']; testId: string; onClick: () => void };

function Section({
  kind,
  title,
  icon,
  items,
  actions,
  onOpen,
  onMenu
}: {
  kind: Kind;
  title: string;
  icon: IconProps['type'];
  items: Item[];
  actions: SectionAction[];
  onOpen: (item: Item) => void;
  onMenu: (event: MouseEvent, item: Item) => void;
}): JSX.Element {
  const [open, setOpen] = useState(true);

  return (
    <Box data-testid='boards-section' data-kind={kind}>
      <BoardsSectionHeaderStyled role='button' aria-expanded={open} onClick={() => setOpen(!open)}>
        <CustomIcon type={open ? 'chevronDown' : 'chevronRight'} size='xs' />
        <Typography variant='caption' sx={{ flex: 1, fontWeight: 600 }}>
          {title} · {items.length}
        </Typography>
        {actions.map((action) => (
          <Tooltip key={action.testId} title={action.label}>
            <IconButton
              aria-label={action.label}
              data-testid={action.testId}
              onClick={(event) => {
                event.stopPropagation();
                action.onClick();
              }}
            >
              <CustomIcon type={action.icon} size='xs' />
            </IconButton>
          </Tooltip>
        ))}
      </BoardsSectionHeaderStyled>
      {open &&
        items.map((item) => (
          <BoardsItemStyled
            key={item.id}
            tabIndex={0}
            data-testid='boards-item'
            data-kind={kind}
            data-name={item.name}
            onClick={() => onOpen(item)}
            onKeyDown={(event) => event.key === 'Enter' && onOpen(item)}
            onContextMenu={(event) => onMenu(event, item)}
          >
            <CustomIcon type={icon} size='xs' />
            <Typography variant='body2' noWrap sx={{ flex: 1, minWidth: 0 }}>
              {item.name}
            </Typography>
          </BoardsItemStyled>
        ))}
    </Box>
  );
}
