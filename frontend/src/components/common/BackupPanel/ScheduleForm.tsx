import api from '@/api';
import type { BackupScheduleType, NotifyOnType } from '@/api/backup/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { nextRuns } from '@/core/backup/schedulePlan';
import { isPostgresDriver } from '@/core/db/connectionAliases';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import DestinationPicker from './DestinationPicker';
import FormSection from './FormSection';
import { describeCadence } from './format';
import NotifyPicker from './NotifyPicker';
import PlanSummary, { type PlanRow } from './PlanSummary';
import ProtectPicker from './ProtectPicker';
import RetentionPicker, { type Retention } from './RetentionPicker';
import ScopePicker, { type Scope, scopeFor } from './ScopePicker';
import Segmented from './Segmented';
import WhenPicker, { type When } from './WhenPicker';

const RETRY_CHOICES = [0, 1, 2, 3, 5];

const cadenceLabel = (c: When['cadence']): string =>
  ({
    hourly: locales.backup_when_hourly,
    daily: locales.backup_when_daily,
    weekly: locales.backup_when_weekly,
    monthly: locales.backup_when_monthly
  })[c];

const keepSentence = (r: Retention): string =>
  r.keepSmart
    ? locales.backup_keep_smart_summary
    : r.keepLast > 0
      ? locales.backup_keep_last_summary.replace('{n}', String(r.keepLast))
      : r.keepDays > 0
        ? locales.backup_keep_days_summary.replace('{n}', String(r.keepDays))
        : locales.backup_keep_all;

/**
 * One page to set up a schedule. Each step is a row of buttons or tiles instead of a field, and the
 * plan on the right is rewritten as you go, with the next run times worked out for the chosen zone.
 */
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
  const [when, setWhen] = useState<When>({
    cadence: job?.cadence ?? 'daily',
    hour: job?.hour ?? 2,
    minute: job?.minute ?? 0,
    weekday: job?.weekday ?? 0,
    monthDay: job?.monthDay ?? 1
  });
  const [retryMax, setRetryMax] = useState(job?.retryMax ?? 2);
  const [retention, setRetention] = useState<Retention>({
    keepSmart: job?.keepSmart ?? true,
    keepLast: job?.keepLast ?? 0,
    keepDays: job?.keepDays ?? 0
  });
  const [compress, setCompress] = useState(job?.compress ?? true);
  const [encrypt, setEncrypt] = useState(job?.encrypted ?? false);
  const [verifyRestore, setVerifyRestore] = useState(job?.verifyRestore ?? false);
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

  const target = [connection?.name, isSqlite ? '' : scope.database, isPostgres ? scope.schema : '']
    .filter(Boolean)
    .join(' · ');
  // Until the user types one, a name worked out from the choices, so a first schedule needs no typing.
  const suggestedName = connection ? `${target} · ${cadenceLabel(when.cadence)}` : '';
  const finalName = name.trim() || suggestedName;

  const problems = [
    scope.connectionId === null ? locales.backup_plan_missing_connection : '',
    encrypt && !job?.encrypted && !passphrase ? locales.backup_plan_missing_passphrase : ''
  ].filter(Boolean);

  const upcoming = nextRuns({ ...when, timezone }, new Date(), 3);
  const destination = destinations.find((d) => d.id === destinationId);

  const handleSave = async (): Promise<void> => {
    if (scope.connectionId === null) return;

    const body = {
      name: finalName,
      ...when,
      timezone,
      ...retention,
      retryMax,
      compress,
      verifyRestore,
      destinationId,
      channelIds,
      notifyOn,
      passphrase: encrypt && passphrase ? passphrase : undefined
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

  const rows: PlanRow[] = [
    { label: locales.backup_plan_what, value: target || '—', testId: 'plan-what' },
    {
      label: locales.backup_plan_when,
      value: `${describeCadence({ ...when, timezone })}${retryMax > 0 ? ` · ${locales.backup_plan_retries.replace('{n}', String(retryMax))}` : ''}`,
      testId: 'plan-when'
    },
    {
      label: locales.backup_plan_next,
      value:
        upcoming.length === 0
          ? '—'
          : upcoming.map((d) => (
              <div key={d.getTime()}>
                {d.toLocaleString([], {
                  timeZone: timezone,
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            )),
      testId: 'plan-next'
    },
    {
      label: locales.backup_plan_where,
      value: destinationId === 0 ? locales.backup_dest_this_device : (destination?.name ?? `#${destinationId}`)
    },
    { label: locales.backup_plan_keeps, value: keepSentence(retention) },
    {
      label: locales.backup_plan_protection,
      value:
        [compress ? locales.backup_compress : '', encrypt ? locales.backup_encrypted : '', verifyRestore ? locales.backup_plan_drill : ''].filter(Boolean).join(' · ') ||
        locales.backup_plan_none
    },
    {
      label: locales.backup_plan_alerts,
      value:
        channelIds.length === 0
          ? locales.backup_plan_none
          : `${channels
              .filter((c) => channelIds.includes(c.id))
              .map((c) => c.name)
              .join(', ')} · ${
              notifyOn === 'failure'
                ? locales.backup_notify_failure
                : notifyOn === 'always'
                  ? locales.backup_notify_always
                  : locales.backup_notify_never
            }`
    }
  ];

  return (
    <Box
      data-testid='backup-job-wizard'
      sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 280px' }, gap: 3 }}
    >
      <div>
        <FormSection step={1} title={locales.backup_form_source}>
          <FieldInput
            name='job-name'
            label={locales.backup_schedule_name}
            placeholder={suggestedName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin='none'
          />
          <ScopePicker connections={writable} value={scope} onChange={setScope} connectionLocked={job !== undefined} />
        </FormSection>

        <FormSection step={2} title={locales.backup_form_schedule}>
          <WhenPicker value={when} timezone={timezone} onChange={(patch) => setWhen((w) => ({ ...w, ...patch }))} />
          <Box>
            <Box component='span' sx={{ typography: 'caption', color: 'text.secondary', display: 'block', mb: 0.5 }}>
              {locales.backup_schedule_retry}
            </Box>
            <Segmented
              testId='retry-max'
              value={retryMax}
              onChange={setRetryMax}
              options={RETRY_CHOICES.map((n) => ({ value: n, label: n === 0 ? locales.backup_off : String(n) }))}
            />
            <Box component='span' sx={{ typography: 'caption', color: 'text.secondary', display: 'block', mt: 0.5 }}>
              {locales.backup_schedule_retry_hint}
            </Box>
          </Box>
        </FormSection>

        <FormSection step={3} title={locales.backup_form_where}>
          <DestinationPicker value={destinationId} onChange={setDestinationId} />
        </FormSection>

        <FormSection step={4} title={locales.backup_form_keep} hint={locales.backup_form_keep_hint}>
          <RetentionPicker
            value={retention}
            cadence={when.cadence}
            lastSize={job?.lastSize ?? 0}
            onChange={setRetention}
          />
        </FormSection>

        <FormSection step={5} title={locales.backup_form_protect}>
          <ProtectPicker
            compress={compress}
            onCompress={setCompress}
            alreadyEncrypted={job?.encrypted ?? false}
            encrypt={encrypt}
            onEncrypt={setEncrypt}
            passphrase={passphrase}
            onPassphrase={setPassphrase}
            verifyRestore={verifyRestore}
            onVerifyRestore={setVerifyRestore}
          />
        </FormSection>

        <FormSection step={6} title={locales.backup_form_notifications}>
          <NotifyPicker
            channelIds={channelIds}
            onChannels={setChannelIds}
            notifyOn={notifyOn}
            onNotifyOn={setNotifyOn}
          />
        </FormSection>
      </div>

      <PlanSummary
        rows={rows}
        problems={problems}
        busy={busy}
        saveLabel={job ? locales.backup_job_save : locales.backup_schedule_create}
        onSave={() => void handleSave()}
        onCancel={onCancel}
      />
    </Box>
  );
}
