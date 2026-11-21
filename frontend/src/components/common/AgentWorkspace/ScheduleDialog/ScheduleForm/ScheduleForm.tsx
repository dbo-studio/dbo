import Segmented from '@/components/base/Segmented/Segmented';
import api from '@/api';
import type {
  DashboardType,
  SubscriptionFrequency,
  SubscriptionKind,
  SubscriptionRequestType
} from '@/api/dashboard/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Modal from '@/components/base/Modal/Modal';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import locales from '@/locales';
import { Button, InputBase, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { toast } from 'sonner';
import Row from '../Row/Row';
import SmtpForm from '../SmtpForm';
import { WEEKDAYS, timezone } from '../scheduleUtils';
import { ScheduleFormBodyStyled, ScheduleNewStyled, ScheduleWeekdayStyled } from './ScheduleForm.styled';

export default function ScheduleForm({ board, onClose }: { board: DashboardType; onClose: () => void }): JSX.Element {
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
    onError: (error: unknown) =>
      toast.error(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? locales.action_failed
      )
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={locales.schedule_title}
      footer={
        <>
          <Button onClick={onClose}>{locales.close}</Button>
          <Button
            variant='contained'
            disabled={!data || isPending || !target.trim()}
            onClick={() => create()}
            data-testid='schedule-create'
          >
            {locales.schedule_add}
          </Button>
        </>
      }
    >
      {!data ? (
        <Typography variant='body2'>…</Typography>
      ) : (
        <ScheduleFormBodyStyled data-testid='schedule-dialog'>
          <Typography variant='body2' color='textSubdued'>
            {locales.schedule_intro}
          </Typography>
          <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
            <Typography
              variant='caption'
              color={data.emailConfigured ? 'textSubdued' : 'error'}
              sx={{ flex: 1 }}
              data-testid='schedule-email-status'
            >
              {data.emailConfigured ? locales.schedule_email_ready : locales.schedule_email_missing}
            </Typography>
            <Button onClick={() => setShowSmtp(!showSmtp)} data-testid='schedule-smtp-toggle'>
              {locales.schedule_email_settings}
            </Button>
          </Stack>
          {showSmtp && (
            <SmtpForm
              onSaved={() => void queryClient.invalidateQueries({ queryKey: ['dashboard-subscriptions', board.id] })}
            />
          )}

          <ScheduleNewStyled>
            <Segmented
              testId='schedule-kind'
              value={kind}
              onChange={setKind}
              options={[
                { value: 'email', label: locales.schedule_email },
                { value: 'webhook', label: locales.schedule_webhook }
              ]}
            />
            <InputBase
              placeholder={kind === 'email' ? locales.schedule_target_email : locales.schedule_target_webhook}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              inputProps={{ 'aria-label': locales.schedule_target, 'data-testid': 'schedule-target' }}
            />
            {kind === 'webhook' && (
              <FieldInput
                type='password'
                placeholder={locales.schedule_secret}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                inputProps={{ 'aria-label': locales.schedule_secret, 'data-testid': 'schedule-secret' }}
                mb={0}
              />
            )}
            <Stack direction='row' spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Segmented
                testId='schedule-frequency'
                value={frequency}
                onChange={setFrequency}
                options={(['hourly', 'daily', 'weekly'] as const).map((value) => ({
                  value,
                  label: locales[`schedule_${value}`]
                }))}
              />
              {frequency === 'weekly' && (
                <ScheduleWeekdayStyled>
                  <SelectInput
                    testId='schedule-weekday'
                    value={weekday}
                    options={WEEKDAYS}
                    onChange={(picked) => setWeekday((picked as SelectInputOption).value as string)}
                  />
                </ScheduleWeekdayStyled>
              )}
              {frequency === 'hourly' ? (
                <InputBase
                  type='number'
                  value={minute}
                  onChange={(event) => setMinute(event.target.value)}
                  inputProps={{
                    'aria-label': locales.schedule_minute,
                    'data-testid': 'schedule-minute',
                    min: 0,
                    max: 59
                  }}
                  sx={{ width: 90 }}
                />
              ) : (
                <InputBase
                  type='time'
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  inputProps={{ 'aria-label': locales.schedule_time, 'data-testid': 'schedule-time' }}
                />
              )}
              <Typography variant='caption' color='textSubdued'>
                {timezone}
              </Typography>
            </Stack>
          </ScheduleNewStyled>

          {data.items.map((sub) => (
            <Row key={sub.id} boardId={board.id} sub={sub} />
          ))}
        </ScheduleFormBodyStyled>
      )}
    </Modal>
  );
}