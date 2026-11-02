import api from '@/api';
import type { BackupCadenceType, BackupScheduleType, NotifyOnType } from '@/api/backup/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { isPostgresDriver } from '@/core/db/connectionAliases';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Button, Switch } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { FormActionsStyled } from './BackupPanel.styled';
import { FormGroup, FormRow } from './FormRow';
import { describeCadence } from './format';
import ScopePicker, { type Scope, scopeFor } from './ScopePicker';

const asNumber = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/** One page for a schedule: source, timing, storage and notifications, saved together. */
export default function ScheduleForm({
  job,
  onDone,
  onCancel
}: {
  /** Set to edit an existing job instead of creating one. */
  job?: BackupScheduleType;
  onDone: () => void;
  onCancel: () => void;
}): JSX.Element {
  const connections = useConnectionStore((s) => s.connections) ?? [];
  const writable = connections.filter((c) => (c.access ?? 'owner') !== 'viewer');

  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(job?.name ?? '');
  const [scope, setScope] = useState<Scope>(() =>
    job ? { connectionId: job.connectionId, database: job.database, schema: job.schema } : scopeFor(writable[0])
  );
  const [cadence, setCadence] = useState<BackupCadenceType>(job?.cadence ?? 'daily');
  const [hour, setHour] = useState(job?.hour ?? 2);
  const [minute, setMinute] = useState(job?.minute ?? 0);
  const [weekday, setWeekday] = useState(job?.weekday ?? 0);
  const [keepLast, setKeepLast] = useState(job?.keepLast ?? 7);
  const [keepDays, setKeepDays] = useState(job?.keepDays ?? 0);
  const [keepSmart, setKeepSmart] = useState(job?.keepSmart ?? false);
  const [retryMax, setRetryMax] = useState(job?.retryMax ?? 2);
  const [compress, setCompress] = useState(job?.compress ?? true);
  const [passphrase, setPassphrase] = useState('');
  const [destinationId, setDestinationId] = useState(job?.destinationId ?? 0);
  const [channelIds, setChannelIds] = useState<number[]>(job?.channelIds ?? []);
  const [notifyOn, setNotifyOn] = useState<NotifyOnType>(job?.notifyOn ?? 'failure');
  const [timezone] = useState(() => job?.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'));

  const { data: destinations = [] } = useQuery({
    queryKey: ['backup-connectors', 'destination'],
    queryFn: () => api.backup.connectors('destination')
  });
  const { data: channels = [] } = useQuery({
    queryKey: ['backup-connectors', 'channel'],
    queryFn: () => api.backup.connectors('channel')
  });

  const connection = writable.find((c) => c.id === scope.connectionId);
  const isSqlite = connection?.type === 'sqlite';
  const isPostgres = connection ? isPostgresDriver(connection.type) : false;
  const valid = name.trim() !== '' && scope.connectionId !== null;

  const handleSave = async (): Promise<void> => {
    if (scope.connectionId === null) return;

    const body = {
      name: name.trim(),
      cadence,
      hour,
      minute,
      weekday,
      timezone,
      keepLast,
      keepDays,
      keepSmart,
      retryMax,
      compress,
      destinationId,
      channelIds,
      notifyOn,
      passphrase: passphrase || undefined
    };

    setBusy(true);
    try {
      if (job) {
        await api.backup.updateSchedule(job.id, {
          ...body,
          database: isSqlite ? '' : scope.database,
          schema: isPostgres ? scope.schema : ''
        });
      } else {
        await api.backup.createSchedule({
          ...body,
          connectionId: scope.connectionId,
          database: isSqlite ? undefined : scope.database || undefined,
          schema: isPostgres ? scope.schema || undefined : undefined
        });
      }
      onDone();
    } catch {
      /* the api layer already toasted */
    } finally {
      setBusy(false);
    }
  };

  const cadenceOptions = [
    { label: locales.backup_schedule_hourly, value: 'hourly' },
    { label: locales.backup_schedule_daily, value: 'daily' },
    { label: locales.backup_schedule_weekly, value: 'weekly' }
  ];

  return (
    <div data-testid='backup-job-wizard'>
      <FormGroup title={locales.backup_form_general}>
        <FormRow label={locales.backup_schedule_name}>
          <FieldInput name='job-name' value={name} onChange={(e) => setName(e.target.value)} margin='none' />
        </FormRow>
      </FormGroup>

      <FormGroup title={locales.backup_form_source}>
        <ScopePicker connections={writable} value={scope} onChange={setScope} connectionLocked={job !== undefined} />
      </FormGroup>

      <FormGroup title={locales.backup_form_schedule}>
        <FormRow
          label={locales.backup_schedule_cadence}
          hint={describeCadence({ cadence, hour, minute, weekday, timezone })}
        >
          <SelectInput
            emptylabel=''
            value={cadence}
            onChange={(e) => setCadence((e as SelectInputOption)?.value as BackupCadenceType)}
            options={cadenceOptions}
          />
        </FormRow>
        {cadence === 'weekly' && (
          <FormRow label={locales.backup_schedule_weekday}>
            <SelectInput
              emptylabel=''
              value={String(weekday)}
              onChange={(e) => setWeekday(Number((e as SelectInputOption)?.value))}
              options={[0, 1, 2, 3, 4, 5, 6].map((d) => ({
                label: locales[`weekday_${d}` as keyof typeof locales],
                value: String(d)
              }))}
            />
          </FormRow>
        )}
        {cadence !== 'hourly' && (
          <FormRow label={locales.backup_schedule_hour} hint={`${locales.backup_schedule_timezone}: ${timezone}`}>
            <FieldInput
              name='job-hour'
              type='number'
              value={String(hour)}
              onChange={(e) => setHour(asNumber(e.target.value, hour))}
              margin='none'
            />
          </FormRow>
        )}
        <FormRow label={locales.backup_schedule_minute}>
          <FieldInput
            name='job-minute'
            type='number'
            value={String(minute)}
            onChange={(e) => setMinute(asNumber(e.target.value, minute))}
            margin='none'
          />
        </FormRow>
        <FormRow label={locales.backup_schedule_retry} hint={locales.backup_schedule_retry_hint}>
          <SelectInput
            emptylabel=''
            value={String(retryMax)}
            onChange={(e) => setRetryMax(Number((e as SelectInputOption)?.value))}
            options={[0, 1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: String(n) }))}
          />
        </FormRow>
      </FormGroup>

      <FormGroup title={locales.backup_form_storage}>
        <FormRow label={locales.backup_job_destination} hint={locales.backup_wizard_local_folder_hint}>
          <SelectInput
            emptylabel=''
            value={String(destinationId)}
            onChange={(e) => setDestinationId(Number((e as SelectInputOption)?.value))}
            testId='wizard-destination'
            options={[
              { label: locales.backup_destination_local, value: '0' },
              ...destinations.filter((d) => d.enabled).map((d) => ({ label: d.name, value: String(d.id) }))
            ]}
          />
        </FormRow>
        <FormRow label={locales.backup_schedule_keep_smart} hint={locales.backup_schedule_keep_smart_hint}>
          <Switch checked={keepSmart} onChange={(e) => setKeepSmart(e.target.checked)} />
        </FormRow>
        {!keepSmart && (
          <>
        <FormRow label={locales.backup_schedule_keep_last}>
          <FieldInput
            name='job-keep-last'
            type='number'
            value={String(keepLast)}
            onChange={(e) => setKeepLast(asNumber(e.target.value, keepLast))}
            margin='none'
          />
        </FormRow>
        <FormRow label={locales.backup_schedule_keep_days}>
          <FieldInput
            name='job-keep-days'
            type='number'
            value={String(keepDays)}
            onChange={(e) => setKeepDays(asNumber(e.target.value, keepDays))}
            margin='none'
          />
        </FormRow>
          </>
        )}
        <FormRow label={locales.backup_compress}>
          <Switch checked={compress} onChange={(e) => setCompress(e.target.checked)} />
        </FormRow>
        <FormRow
          label={locales.backup_encrypt_passphrase}
          hint={
            passphrase !== ''
              ? locales.backup_encrypt_warning
              : job?.encrypted
                ? locales.backup_job_keep_passphrase
                : undefined
          }
        >
          <FieldInput
            name='job-passphrase'
            type='password'
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            margin='none'
          />
        </FormRow>
      </FormGroup>

      <FormGroup title={locales.backup_form_notifications}>
        {channels.length === 0 ? (
          <FormRow label={locales.backup_notify_channels} hint={locales.backup_form_no_channels}>
            <span />
          </FormRow>
        ) : (
          <>
            <FormRow label={locales.backup_notify_channels}>
              <SelectInput
                emptylabel={locales.backup_notify_never}
                isMulti
                value={channelIds.map(String) as unknown as string}
                onChange={(e) => setChannelIds(((e as SelectInputOption[]) ?? []).map((o) => Number(o.value)))}
                options={channels.filter((c) => c.enabled).map((c) => ({ label: c.name, value: String(c.id) }))}
              />
            </FormRow>
            <FormRow label={locales.backup_notify_on}>
              <SelectInput
                emptylabel=''
                value={notifyOn}
                onChange={(e) => setNotifyOn((e as SelectInputOption)?.value as NotifyOnType)}
                options={[
                  { label: locales.backup_notify_failure, value: 'failure' },
                  { label: locales.backup_notify_always, value: 'always' },
                  { label: locales.backup_notify_never, value: 'never' }
                ]}
              />
            </FormRow>
          </>
        )}
      </FormGroup>

      <FormActionsStyled sx={{ mt: 2 }}>
        <Button size='small' onClick={onCancel}>
          {locales.cancel}
        </Button>
        <Button
          size='small'
          variant='contained'
          disabled={busy || !valid}
          onClick={() => void handleSave()}
          data-testid='schedule-save'
        >
          {job ? locales.backup_job_save : locales.backup_schedule_create}
        </Button>
      </FormActionsStyled>
    </div>
  );
}
