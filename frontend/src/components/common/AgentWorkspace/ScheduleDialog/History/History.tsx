import api from '@/api';
import type { SubscriptionType } from '@/api/dashboard/types';
import locales from '@/locales';
import { Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { HistoryRootStyled } from './History.styled';

export default function History({ boardId, sub }: { boardId: number; sub: SubscriptionType }): JSX.Element {
  const { data } = useQuery({
    queryKey: ['dashboard-subscription-runs', boardId, sub.id, sub.lastRunAt],
    queryFn: () => api.dashboard.getSubscriptionRuns(boardId, sub.id)
  });

  return (
    <HistoryRootStyled data-testid='schedule-history'>
      {(data ?? []).length === 0 && <Typography variant='caption'>{locales.schedule_no_runs}</Typography>}
      {(data ?? []).map((run) => (
        <Typography key={run.id} variant='caption' data-testid='schedule-run' data-status={run.status}>
          {new Date(run.startedAt).toLocaleString()} ·{' '}
          {run.status === 'ok' ? locales.schedule_run_ok : locales.schedule_run_failed}
          {run.manual && ` · ${locales.schedule_run_manual}`}
          {run.status === 'ok'
            ? ` · ${locales.schedule_reports.replace('{count}', String(run.reports))}`
            : ` · ${run.error}`}
        </Typography>
      ))}
    </HistoryRootStyled>
  );
}