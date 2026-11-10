import api from '@/api';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import BoardView from '@/components/common/AgentWorkspace/BoardView/BoardView';
import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import type { DashboardTabType } from '@/types/Tab';
import { Box, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';

/** A dashboard opened from the tree. It shares the board view with the AI workstation. */
export default function Dashboard(): JSX.Element {
  const tab = useSelectedTab() as DashboardTabType;
  const connectionId = Number(tab.connectionId);
  const { data, isLoading } = useQuery({
    queryKey: ['dashboards', connectionId],
    queryFn: () => api.dashboard.getDashboards(connectionId)
  });
  const board = data?.find((item) => item.id === tab.dashboardId);

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (!board) {
    return <EmptyState title={locales.dashboard_not_found} description={locales.dashboard_not_found_hint} />;
  }

  return (
    <Box sx={{ height: '100%' }} data-testid='dashboard-tab'>
      <BoardView board={board} />
    </Box>
  );
}
