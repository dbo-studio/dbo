import api from '@/api';
import type { SubscriptionType } from '@/api/dashboard/types';
import locales from '@/locales';
import { Button, Chip, Typography } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { toast } from 'sonner';
import History from '../History/History';
import { describeSubscription } from '../scheduleUtils';
import { ScheduleRowActionsStyled, ScheduleRowHeadStyled, ScheduleRowRootStyled } from './Row.styled';

export default function Row({ boardId, sub }: { boardId: number; sub: SubscriptionType }): JSX.Element {
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const refresh = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: ['dashboard-subscriptions', boardId] });
  const failed = (): void => void toast.error(locales.action_failed);

  const { mutate: runNow, isPending: running } = useMutation({
    mutationFn: () => api.dashboard.runSubscription(boardId, sub.id),
    onSuccess: async (run) => {
      await refresh();
      if (run.status === 'ok') toast.success(locales.schedule_sent);
      else toast.error(run.error);
    },
    onError: failed
  });
  const { mutate: toggle } = useMutation({
    mutationFn: () =>
      api.dashboard.updateSubscription(boardId, sub.id, {
        kind: sub.kind,
        target: sub.target,
        frequency: sub.frequency,
        hour: sub.hour,
        minute: sub.minute,
        weekday: sub.weekday,
        timezone: sub.timezone,
        enabled: !sub.enabled
      }),
    onSuccess: refresh,
    onError: failed
  });
  const { mutate: remove } = useMutation({
    mutationFn: () => api.dashboard.deleteSubscription(boardId, sub.id),
    onSuccess: refresh,
    onError: failed
  });

  const state = !sub.enabled
    ? sub.consecutiveFailures > 0
      ? 'paused_failing'
      : 'paused'
    : sub.lastStatus === 'failed'
      ? 'failing'
      : 'active';

  return (
    <ScheduleRowRootStyled data-testid='schedule-row' data-state={state}>
      <ScheduleRowHeadStyled>
        <Chip label={sub.kind === 'email' ? locales.schedule_email : locales.schedule_webhook} />
        <Typography variant='body2' noWrap sx={{ flex: 1, minWidth: 120 }}>
          {sub.target}
        </Typography>
        <Chip
          label={locales[`schedule_state_${state}`]}
          color={state === 'active' ? 'success' : state === 'paused' ? 'default' : 'error'}
          data-testid='schedule-state'
        />
      </ScheduleRowHeadStyled>
      <Typography variant='caption' color='textSubdued' component='div'>
        {describeSubscription(sub)}
        {sub.enabled && ` · ${locales.schedule_next.replace('{date}', new Date(sub.nextRunAt).toLocaleString())}`}
      </Typography>
      {sub.lastStatus === 'failed' && (
        <Typography variant='caption' color='error' component='div' data-testid='schedule-last-error'>
          {sub.lastError}
        </Typography>
      )}
      <ScheduleRowActionsStyled>
        <Button disabled={running} onClick={() => runNow()} data-testid='schedule-run-now'>
          {locales.schedule_send_now}
        </Button>
        <Button onClick={() => toggle()} data-testid='schedule-toggle'>
          {sub.enabled ? locales.schedule_pause : locales.schedule_resume}
        </Button>
        <Button onClick={() => setShowHistory(!showHistory)} data-testid='schedule-history-toggle'>
          {locales.schedule_history}
        </Button>
        <Button color='error' onClick={() => remove()} data-testid='schedule-delete'>
          {locales.dashboard_delete}
        </Button>
      </ScheduleRowActionsStyled>
      {showHistory && <History boardId={boardId} sub={sub} />}
    </ScheduleRowRootStyled>
  );
}
