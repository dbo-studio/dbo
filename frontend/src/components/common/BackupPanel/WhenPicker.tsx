import type { BackupCadenceType } from '@/api/backup/types';
import locales from '@/locales';
import { Box, Button, InputBase, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { JSX } from 'react';
import Segmented from './Segmented';

export type When = { cadence: BackupCadenceType; hour: number; minute: number; weekday: number; monthDay: number };

const pad = (n: number): string => String(n).padStart(2, '0');
const QUIET_TIMES = ['00:00', '02:00', '04:00', '12:00'];
// The week starts on Monday here; the server counts Sunday as 0.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MINUTES = [0, 15, 30, 45];

/** Frequency as buttons, then only the controls that frequency needs. */
export default function WhenPicker({
  value,
  timezone,
  onChange
}: {
  value: When;
  timezone: string;
  onChange: (patch: Partial<When>) => void;
}): JSX.Element {
  const time = `${pad(value.hour)}:${pad(value.minute)}`;
  const setTime = (text: string): void => {
    const [h, m] = text.split(':').map(Number);
    if (Number.isInteger(h) && Number.isInteger(m)) onChange({ hour: h, minute: m });
  };

  return (
    <>
      <Segmented
        testId='when-cadence'
        value={value.cadence}
        onChange={(cadence) => onChange({ cadence })}
        options={[
          { value: 'hourly', label: locales.backup_when_hourly },
          { value: 'daily', label: locales.backup_when_daily },
          { value: 'weekly', label: locales.backup_when_weekly },
          { value: 'monthly', label: locales.backup_when_monthly }
        ]}
      />

      {value.cadence === 'weekly' && (
        <Segmented
          testId='when-weekday'
          value={value.weekday}
          onChange={(weekday) => onChange({ weekday })}
          options={WEEK_ORDER.map((d) => ({
            value: d,
            label: String(locales[`weekday_${d}` as keyof typeof locales]).slice(0, 3)
          }))}
        />
      )}

      {value.cadence === 'monthly' && (
        <Box>
          <Typography variant='caption' color='textSubdued' component='p' sx={{ mb: 0.5 }}>
            {locales.backup_when_month_day}
          </Typography>
          <ToggleButtonGroup
            exclusive
            size='small'
            value={value.monthDay}
            onChange={(_, day: number | null) => day !== null && onChange({ monthDay: day })}
            sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 2.5rem)', gap: 0.5 }}
            data-testid='when-month-day'
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <ToggleButton key={d} value={d} sx={{ py: 0.25, border: 1, borderColor: 'divider' }}>
                {d}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      {value.cadence === 'hourly' ? (
        <Box>
          <Typography variant='caption' color='textSubdued' component='p' sx={{ mb: 0.5 }}>
            {locales.backup_when_minute}
          </Typography>
          <Segmented
            testId='when-minute'
            value={value.minute}
            onChange={(minute) => onChange({ minute })}
            options={[...new Set([...MINUTES, value.minute])]
              .sort((a, b) => a - b)
              .map((m) => ({ value: m, label: `:${pad(m)}` }))}
          />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ width: 120 }}>
            <InputBase
              name='job-time'
              type='time'
              value={time}
              onChange={(e) => setTime(e.target.value)}
              margin='none'
            />
          </Box>
          {QUIET_TIMES.map((t) => (
            <Button key={t} variant={t === time ? 'contained' : 'text'} onClick={() => setTime(t)}>
              {t}
            </Button>
          ))}
        </Box>
      )}

      <Typography variant='caption' color='textSubdued'>
        {locales.backup_schedule_timezone}: {timezone}
      </Typography>
    </>
  );
}
