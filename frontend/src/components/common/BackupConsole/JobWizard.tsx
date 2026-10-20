import api from '@/api';
import type { BackupCadenceType } from '@/api/backup/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { SelectInputOption } from '@/components/base/SelectInput/types';
import { isPostgresDriver } from '@/core/db/connectionAliases';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Box, Button, Checkbox, FormControlLabel, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { describeCadence } from './format';

const STEPS = [
  locales.backup_wizard_general,
  locales.backup_wizard_destination,
  locales.backup_wizard_source,
  locales.backup_wizard_schedule,
  locales.backup_wizard_options
];

const asNumber = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/** Five-step form: General, Destination, Source, Schedule, Options. */
export default function JobWizard({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }): JSX.Element {
  const connections = useConnectionStore((s) => s.connections) ?? [];
  const writable = connections.filter((c) => (c.access ?? 'owner') !== 'viewer');

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [connectionId, setConnectionId] = useState<number | null>(writable[0]?.id ?? null);
  const [database, setDatabase] = useState('');
  const [schema, setSchema] = useState('public');
  const [cadence, setCadence] = useState<BackupCadenceType>('daily');
  const [hour, setHour] = useState(2);
  const [minute, setMinute] = useState(0);
  const [weekday, setWeekday] = useState(0);
  const [keepLast, setKeepLast] = useState(7);
  const [keepDays, setKeepDays] = useState(0);
  const [compress, setCompress] = useState(true);
  const [passphrase, setPassphrase] = useState('');
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  const connection = writable.find((c) => c.id === connectionId);
  const isSqlite = connection?.type === 'sqlite';
  const isPostgres = connection ? isPostgresDriver(connection.type) : false;

  const pickConnection = (id: number): void => {
    setConnectionId(id);
    const picked = writable.find((c) => c.id === id);
    const options = picked?.options;
    setDatabase(options && 'database' in options ? (options.database ?? '') : '');
  };

  const canNext = [name.trim() !== '', true, connectionId !== null, true, true][step] ?? false;

  const handleCreate = async (): Promise<void> => {
    if (connectionId === null) return;

    setBusy(true);
    try {
      await api.backup.createSchedule({
        connectionId,
        name: name.trim(),
        database: isSqlite ? undefined : database || undefined,
        schema: isPostgres ? schema || undefined : undefined,
        cadence,
        hour,
        minute,
        weekday,
        timezone,
        keepLast,
        keepDays,
        compress,
        passphrase: passphrase || undefined
      });
      onDone();
    } catch {
      /* the api layer already toasted */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box data-testid='backup-job-wizard'>
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ minHeight: 190 }}>
        {step === 0 && (
          <FieldInput
            name='job-name'
            label={locales.backup_schedule_name}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        {step === 1 && (
          <>
            <SelectInput
              emptylabel=''
              value='local'
              onChange={() => undefined}
              label={locales.backup_job_destination}
              options={[{ label: locales.backup_wizard_local_folder, value: 'local' }]}
            />
            <Typography variant='caption' color='textSubdued'>
              {locales.backup_wizard_local_folder_hint}
            </Typography>
          </>
        )}

        {step === 2 && (
          <>
            <SelectInput
              emptylabel={locales.backup_wizard_pick_connection}
              value={connectionId === null ? undefined : String(connectionId)}
              onChange={(e) => pickConnection(Number((e as SelectInputOption)?.value))}
              label={locales.backup_job_connection}
              options={writable.map((c) => ({ label: c.name, value: String(c.id) }))}
            />
            {!isSqlite && (
              <FieldInput
                name='job-database'
                label={locales.backup_database}
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
              />
            )}
            {isPostgres && (
              <FieldInput
                name='job-schema'
                label={locales.backup_schema}
                value={schema}
                onChange={(e) => setSchema(e.target.value)}
              />
            )}
          </>
        )}

        {step === 3 && (
          <>
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
                    name='job-hour'
                    type='number'
                    label={locales.backup_schedule_hour}
                    value={String(hour)}
                    onChange={(e) => setHour(asNumber(e.target.value, hour))}
                  />
                </Box>
              )}
              <Box sx={{ flex: 1 }}>
                <FieldInput
                  name='job-minute'
                  type='number'
                  label={locales.backup_schedule_minute}
                  value={String(minute)}
                  onChange={(e) => setMinute(asNumber(e.target.value, minute))}
                />
              </Box>
            </Box>
            <Typography variant='caption' color='textSubdued'>
              {locales.backup_schedule_timezone}: {timezone}
            </Typography>
          </>
        )}

        {step === 4 && (
          <>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <FieldInput
                  name='job-keep-last'
                  type='number'
                  label={locales.backup_schedule_keep_last}
                  value={String(keepLast)}
                  onChange={(e) => setKeepLast(asNumber(e.target.value, keepLast))}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <FieldInput
                  name='job-keep-days'
                  type='number'
                  label={locales.backup_schedule_keep_days}
                  value={String(keepDays)}
                  onChange={(e) => setKeepDays(asNumber(e.target.value, keepDays))}
                />
              </Box>
            </Box>
            <FormControlLabel
              control={<Checkbox checked={compress} onChange={(e) => setCompress(e.target.checked)} />}
              label={locales.backup_compress}
            />
            <FieldInput
              name='job-passphrase'
              type='password'
              label={locales.backup_encrypt_passphrase}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
            {passphrase !== '' && (
              <Typography variant='caption' color='warning.main' component='p'>
                {locales.backup_encrypt_warning}
              </Typography>
            )}
            <Typography variant='body2' color='textSubdued' sx={{ mt: 2 }}>
              {locales.backup_wizard_summary
                .replace('{schedule}', describeCadence({ cadence, hour, minute, weekday, timezone }))
                .replace(
                  '{keep}',
                  keepLast > 0
                    ? locales.backup_wizard_keep_n.replace('{n}', String(keepLast))
                    : locales.backup_wizard_keep_all
                )}
            </Typography>
          </>
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button size='small' onClick={step === 0 ? onCancel : () => setStep(step - 1)}>
          {step === 0 ? locales.cancel : locales.backup_wizard_back}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button size='small' variant='contained' disabled={!canNext} onClick={() => setStep(step + 1)}>
            {locales.backup_wizard_next}
          </Button>
        ) : (
          <Button size='small' variant='contained' disabled={busy} onClick={() => void handleCreate()}>
            {locales.backup_schedule_create}
          </Button>
        )}
      </Box>
    </Box>
  );
}
