import api from '@/api';
import type {
  DashboardType,
  SubscriptionFrequency,
  SubscriptionKind,
  SubscriptionRequestType,
  SubscriptionType
} from '@/api/dashboard/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Modal from '@/components/base/Modal/Modal';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import locales from '@/locales';
import { Box, Button, Chip, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { toast } from 'sonner';
import SmtpForm from './SmtpForm';

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const pad = (value: number): string => String(value).padStart(2, '0');
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6].map(
  (day): SelectInputOption => ({
    value: String(day),
    // 2024-01-07 is a Sunday.
    label: new Date(2024, 0, 7 + day).toLocaleDateString(undefined, { weekday: 'long' })
  })
);

const describe = (sub: SubscriptionType): string => {
  const time = `${pad(sub.hour)}:${pad(sub.minute)}`;
  const when =
    sub.frequency === 'hourly'
      ? locales.schedule_hourly_at.replace('{minute}', pad(sub.minute))
      : sub.frequency === 'daily'
        ? locales.schedule_daily_at.replace('{time}', time)
        : locales.schedule_weekly_at
            .replace('{day}', WEEKDAYS[sub.weekday].label)
            .replace('{time}', time);

  return `${when} (${sub.timezone})`;
};

function History({ boardId, sub }: { boardId: number; sub: SubscriptionType }): JSX.Element {
  const { data } = useQuery({
    queryKey: ['dashboard-subscription-runs', boardId, sub.id, sub.lastRunAt],
    queryFn: () => api.dashboard.getSubscriptionRuns(boardId, sub.id)
  });

  return (
    <Stack spacing={0.25} sx={{ mt: 1 }} data-testid='schedule-history'>
      {(data ?? []).length === 0 && <Typography variant='caption'>{locales.schedule_no_runs}</Typography>}
      {(data ?? []).map((run) => (
        <Typography key={run.id} variant='caption' data-testid='schedule-run' data-status={run.status}>
          {new Date(run.startedAt).toLocaleString()} · {run.status === 'ok' ? locales.schedule_run_ok : locales.schedule_run_failed}
          {run.manual && ` · ${locales.schedule_run_manual}`}
          {run.status === 'ok' ? ` · ${locales.schedule_reports.replace('{count}', String(run.reports))}` : ` · ${run.error}`}
        </Typography>
      ))}
    </Stack>
  );
}

function Row({ boardId, sub }: { boardId: number; sub: SubscriptionType }): JSX.Element {
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: ['dashboard-subscriptions', boardId] });
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

  const state = !sub.enabled ? (sub.consecutiveFailures > 0 ? 'paused_failing' : 'paused') : sub.lastStatus === 'failed' ? 'failing' : 'active';

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }} data-testid='schedule-row' data-state={state}>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
        <Chip size='small' label={sub.kind === 'email' ? locales.schedule_email : locales.schedule_webhook} />
        <Typography variant='body2' noWrap sx={{ flex: 1, minWidth: 120 }}>
          {sub.target}
        </Typography>
        <Chip
          size='small'
          label={locales[`schedule_state_${state}`]}
          color={state === 'active' ? 'success' : state === 'paused' ? 'default' : 'error'}
          data-testid='schedule-state'
        />
      </Stack>
      <Typography variant='caption' color='textSubdued' component='div'>
        {describe(sub)}
        {sub.enabled && ` · ${locales.schedule_next.replace('{date}', new Date(sub.nextRunAt).toLocaleString())}`}
      </Typography>
      {sub.lastStatus === 'failed' && (
        <Typography variant='caption' color='error' component='div' data-testid='schedule-last-error'>
          {sub.lastError}
        </Typography>
      )}
      <Stack direction='row' spacing={0.5} sx={{ mt: 0.5 }}>
        <Button size='small' disabled={running} onClick={() => runNow()} data-testid='schedule-run-now'>
          {locales.schedule_send_now}
        </Button>
        <Button size='small' onClick={() => toggle()} data-testid='schedule-toggle'>
          {sub.enabled ? locales.schedule_pause : locales.schedule_resume}
        </Button>
        <Button size='small' onClick={() => setShowHistory(!showHistory)} data-testid='schedule-history-toggle'>
          {locales.schedule_history}
        </Button>
        <Button size='small' color='error' onClick={() => remove()} data-testid='schedule-delete'>
          {locales.dashboard_delete}
        </Button>
      </Stack>
      {showHistory && <History boardId={boardId} sub={sub} />}
    </Box>
  );
}

function ScheduleForm({ board }: { board: DashboardType }): JSX.Element {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<SubscriptionKind>('email');
  const [target, setTarget] = useState('');
  const [secret, setSecret] = useState('');
  const [frequency, setFrequency] = useState<SubscriptionFrequency>('daily');
  const [time, setTime] = useState('09:00');
  const [minute, setMinute] = useState('0');
  const [weekday, setWeekday] = useState('1');
  const [showSmtp, setShowSmtp] = useState(false);
  const { data } = useQuery({
    queryKey: ['dashboard-subscriptions', board.id],
    queryFn: () => api.dashboard.getSubscriptions(board.id)
  });

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => {
      const [hour, min] = time.split(':').map(Number);
      const body: SubscriptionRequestType = {
        kind,
        target,
        frequency,
        hour: frequency === 'hourly' ? 0 : hour,
        minute: frequency === 'hourly' ? Number(minute) : min,
        weekday: Number(weekday),
        timezone,
        ...(kind === 'webhook' && secret ? { secret } : {})
      };

      return api.dashboard.createSubscription(board.id, body);
    },
    onSuccess: async () => {
      setTarget('');
      setSecret('');
      await queryClient.invalidateQueries({ queryKey: ['dashboard-subscriptions', board.id] });
    },
    // The server says what is wrong (a bad address, no mail account yet).
    onError: (error: unknown) => toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message ?? locales.action_failed)
  });

  if (!data) return <Typography variant='body2'>…</Typography>;

  return (
    <Stack spacing={1.5} sx={{ width: 600, maxWidth: '100%' }} data-testid='schedule-dialog'>
      <Typography variant='body2' color='textSubdued'>
        {locales.schedule_intro}
      </Typography>
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant='caption' color={data.emailConfigured ? 'textSubdued' : 'error'} sx={{ flex: 1 }} data-testid='schedule-email-status'>
          {data.emailConfigured ? locales.schedule_email_ready : locales.schedule_email_missing}
        </Typography>
        <Button size='small' onClick={() => setShowSmtp(!showSmtp)} data-testid='schedule-smtp-toggle'>
          {locales.schedule_email_settings}
        </Button>
      </Stack>
      {showSmtp && <SmtpForm onSaved={() => void queryClient.invalidateQueries({ queryKey: ['dashboard-subscriptions', board.id] })} />}

      <Stack spacing={1} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
        <ToggleButtonGroup
          exclusive
          size='small'
          value={kind}
          onChange={(_, next: SubscriptionKind | null) => next && setKind(next)}
        >
          <ToggleButton value='email' data-testid='schedule-kind-email'>
            {locales.schedule_email}
          </ToggleButton>
          <ToggleButton value='webhook' data-testid='schedule-kind-webhook'>
            {locales.schedule_webhook}
          </ToggleButton>
        </ToggleButtonGroup>
        <FieldInput
          size='small'
          placeholder={kind === 'email' ? locales.schedule_target_email : locales.schedule_target_webhook}
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          inputProps={{ 'aria-label': locales.schedule_target, 'data-testid': 'schedule-target' }}
          mb={0}
        />
        {kind === 'webhook' && (
          <FieldInput
            size='small'
            type='password'
            placeholder={locales.schedule_secret}
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            inputProps={{ 'aria-label': locales.schedule_secret, 'data-testid': 'schedule-secret' }}
            mb={0}
          />
        )}
        <Stack direction='row' spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <ToggleButtonGroup
            exclusive
            size='small'
            value={frequency}
            onChange={(_, next: SubscriptionFrequency | null) => next && setFrequency(next)}
          >
            {(['hourly', 'daily', 'weekly'] as const).map((value) => (
              <ToggleButton key={value} value={value} data-testid={`schedule-frequency-${value}`}>
                {locales[`schedule_${value}`]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {frequency === 'weekly' && (
            <Box sx={{ width: 150 }}>
              <SelectInput
                testId='schedule-weekday'
                value={weekday}
                options={WEEKDAYS}
                onChange={(picked) => setWeekday((picked as SelectInputOption).value as string)}
              />
            </Box>
          )}
          {frequency === 'hourly' ? (
            <FieldInput
              size='small'
              type='number'
              value={minute}
              onChange={(event) => setMinute(event.target.value)}
              inputProps={{ 'aria-label': locales.schedule_minute, 'data-testid': 'schedule-minute', min: 0, max: 59 }}
              mb={0}
              sx={{ width: 90 }}
            />
          ) : (
            <FieldInput
              size='small'
              type='time'
              value={time}
              onChange={(event) => setTime(event.target.value)}
              inputProps={{ 'aria-label': locales.schedule_time, 'data-testid': 'schedule-time' }}
              mb={0}
            />
          )}
          <Typography variant='caption' color='textSubdued'>
            {timezone}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button size='small' variant='contained' disabled={isPending || !target.trim()} onClick={() => create()} data-testid='schedule-create'>
            {locales.schedule_add}
          </Button>
        </Stack>
      </Stack>

      {data.items.map((sub) => (
        <Row key={sub.id} boardId={board.id} sub={sub} />
      ))}
    </Stack>
  );
}

/** Schedules that send a board's reports by email or to a webhook: a CSV per report, on a timetable. */
export default function ScheduleDialog({ board, open, onClose }: { board: DashboardType; open: boolean; onClose: () => void }): JSX.Element {
  return (
    <Modal open={open} onClose={onClose} title={locales.schedule_title}>
      {open && <ScheduleForm board={board} />}
    </Modal>
  );
}
