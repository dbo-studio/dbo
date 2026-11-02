import api from '@/api';
import type { BackupCadenceType, BackupScheduleType } from '@/api/backup/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { SelectInputOption } from '@/components/base/SelectInput/types';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { Box, Button, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';

type Props = {
  connectionId: number;
  database: string;
  schema?: string;
  canWrite: boolean;
  onRunStarted: (jobId: number) => void;
};

const pad = (n: number): string => String(n).padStart(2, '0');

const describe = (s: BackupScheduleType): string => {
  if (s.cadence === 'hourly') return `${locales.backup_schedule_hourly} :${pad(s.minute)}`;
  const time = `${pad(s.hour)}:${pad(s.minute)} ${s.timezone}`;
  if (s.cadence === 'weekly') {
    return `${locales.backup_schedule_weekly}, ${locales[`weekday_${s.weekday}` as keyof typeof locales]} ${time}`;
  }
  return `${locales.backup_schedule_daily} ${time}`;
};

export default function BackupSchedules({
  connectionId,
  database,
  schema,
  canWrite,
  onRunStarted
}: Props): JSX.Element {
  const queryClient = useQueryClient();
  const confirm = useConfirmModalStore((state) => state.danger);
  const { data: all = [] } = useQuery({ queryKey: ['backup-schedules'], queryFn: api.backup.schedules });
  const schedules = all.filter((s) => s.connectionId === connectionId);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [cadence, setCadence] = useState<BackupCadenceType>('daily');
  const [hour, setHour] = useState(2);
  const [minute, setMinute] = useState(0);
  const [weekday, setWeekday] = useState(0);
  const [keepLast, setKeepLast] = useState(7);
  const [keepDays, setKeepDays] = useState(0);
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  const refresh = (): void => void queryClient.invalidateQueries({ queryKey: ['backup-schedules'] });

  const handleCreate = async (): Promise<void> => {
    try {
      await api.backup.createSchedule({
        connectionId,
        name: name.trim(),
        database: database || undefined,
        schema: schema || undefined,
        cadence,
        hour,
        minute,
        weekday,
        timezone,
        keepLast,
        keepDays
      });
      setCreating(false);
      setName('');
      refresh();
    } catch {
      /* the api layer already toasted */
    }
  };

  const handleToggle = async (s: BackupScheduleType): Promise<void> => {
    try {
      await api.backup.updateSchedule(s.id, { enabled: !s.enabled });
      refresh();
    } catch {
      /* the api layer already toasted */
    }
  };

  const handleRun = async (s: BackupScheduleType): Promise<void> => {
    try {
      const { jobId } = await api.backup.runSchedule(s.id);
      onRunStarted(jobId);
    } catch {
      /* the api layer already toasted */
    }
  };

  const handleDelete = (s: BackupScheduleType): void => {
    confirm(locales.delete_action, locales.backup_schedule_delete_confirm, () => {
      void api.backup
        .deleteSchedule(s.id)
        .then(refresh)
        .catch(() => undefined);
    });
  };

  const number = (value: string, fallback: number): number => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
        <Typography variant='subtitle2' sx={{ flex: 1 }}>
          {locales.backup_schedules}
        </Typography>
        {canWrite && !creating && (
          <Button size='small' onClick={() => setCreating(true)}>
            {locales.backup_schedule_new}
          </Button>
        )}
      </Box>
      <Typography variant='caption' color='textSubdued' component='p' sx={{ mb: 1 }}>
        {locales.backup_schedule_needs_password}
      </Typography>

      {schedules.length === 0 && !creating && (
        <Typography variant='body2' color='textSubdued'>
          {locales.backup_schedule_empty}
        </Typography>
      )}

      {schedules.map((s) => (
        <Box
          key={s.id}
          data-testid={`backup-schedule-${s.name}`}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderTop: 1, borderColor: 'divider' }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant='body2' noWrap>
              {s.name} · {describe(s)}
              {!s.enabled ? ` · ${locales.backup_schedule_paused}` : ''}
            </Typography>
            {!s.passwordRemembered && (
              <Typography variant='caption' color='warning.main' component='p'>
                {locales.backup_schedule_password_warning}
              </Typography>
            )}
            <Typography variant='caption' color={s.lastStatus === 'failed' ? 'error.main' : 'textSubdued'} noWrap>
              {s.lastStatus === 'failed'
                ? `${locales.backup_schedule_failed}: ${s.lastError}`
                : s.enabled && s.nextRunAt
                  ? `${locales.backup_schedule_next}: ${new Date(s.nextRunAt).toLocaleString()}`
                  : s.lastRunAt
                    ? `${locales.backup_schedule_last}: ${new Date(s.lastRunAt).toLocaleString()}`
                    : ''}
            </Typography>
          </Box>
          {canWrite && (
            <>
              <Button size='small' onClick={() => void handleRun(s)}>
                {locales.backup_schedule_run_now}
              </Button>
              <Button size='small' onClick={() => void handleToggle(s)}>
                {s.enabled ? locales.backup_schedule_pause : locales.backup_schedule_resume}
              </Button>
              <Button size='small' color='error' onClick={() => handleDelete(s)}>
                {locales.delete}
              </Button>
            </>
          )}
        </Box>
      ))}

      {creating && (
        <Box sx={{ mt: 1 }}>
          <FieldInput
            name='schedule-name'
            label={locales.backup_schedule_name}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <SelectInput
            emptylabel=''
            value={cadence}
            onChange={(e) => setCadence((e as SelectInputOption)?.value as BackupCadenceType)}
            label={locales.backup_schedule_cadence}
            options={[
              { label: locales.backup_schedule_hourly, value: 'hourly' },
              { label: locales.backup_schedule_daily, value: 'daily' },
              { label: locales.backup_schedule_weekly, value: 'weekly' }
            ]}
          />
          {cadence === 'weekly' && (
            <SelectInput
              emptylabel=''
              value={String(weekday)}
              onChange={(e) => setWeekday(Number((e as SelectInputOption)?.value))}
              label={locales.backup_schedule_weekday}
              options={[0, 1, 2, 3, 4, 5, 6].map((d) => ({
                label: locales[`weekday_${d}` as keyof typeof locales],
                value: String(d)
              }))}
            />
          )}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {cadence !== 'hourly' && (
              <Box sx={{ flex: 1 }}>
                <FieldInput
                  name='schedule-hour'
                  type='number'
                  label={locales.backup_schedule_hour}
                  value={String(hour)}
                  onChange={(e) => setHour(number(e.target.value, hour))}
                />
              </Box>
            )}
            <Box sx={{ flex: 1 }}>
              <FieldInput
                name='schedule-minute'
                type='number'
                label={locales.backup_schedule_minute}
                value={String(minute)}
                onChange={(e) => setMinute(number(e.target.value, minute))}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldInput
                name='schedule-keep-last'
                type='number'
                label={locales.backup_schedule_keep_last}
                value={String(keepLast)}
                onChange={(e) => setKeepLast(number(e.target.value, keepLast))}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldInput
                name='schedule-keep-days'
                type='number'
                label={locales.backup_schedule_keep_days}
                value={String(keepDays)}
                onChange={(e) => setKeepDays(number(e.target.value, keepDays))}
              />
            </Box>
          </Box>
          <Typography variant='caption' color='textSubdued'>
            {locales.backup_schedule_timezone}: {timezone}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
            <Button size='small' onClick={() => setCreating(false)}>
              {locales.cancel}
            </Button>
            <Button size='small' variant='contained' disabled={!name.trim()} onClick={() => void handleCreate()}>
              {locales.backup_schedule_create}
            </Button>
          </Box>
        </Box>
      )}
    </>
  );
}
