import Segmented from '@/components/base/Segmented/Segmented';
import { HORIZON_DAYS, keptAges, type PlanCadence } from '@/core/backup/schedulePlan';
import locales from '@/locales';
import { Box, InputBase, Typography } from '@mui/material';
import { type JSX, useMemo } from 'react';
import { formatSize } from '../format';
import Timeline from './Timeline/Timeline';

export type Retention = { keepSmart: boolean; keepLast: number; keepDays: number };

type Mode = 'smart' | 'last' | 'days' | 'all';

const modeOf = (r: Retention): Mode =>
  r.keepSmart ? 'smart' : r.keepLast > 0 ? 'last' : r.keepDays > 0 ? 'days' : 'all';

/** How long to keep backups, shown as a picture of which days survive. */
export default function RetentionPicker({
  value,
  cadence,
  lastSize,
  onChange
}: {
  value: Retention;
  cadence: PlanCadence;
  /** Size of the newest backup of this schedule, for the storage estimate. */
  lastSize: number;
  onChange: (next: Retention) => void;
}): JSX.Element {
  const mode = modeOf(value);
  const kept = useMemo(() => keptAges(cadence, value).length, [cadence, value]);

  const pick = (next: Mode): void => {
    if (next === 'smart') onChange({ keepSmart: true, keepLast: 0, keepDays: 0 });
    if (next === 'last') onChange({ keepSmart: false, keepLast: value.keepLast || 7, keepDays: 0 });
    if (next === 'days') onChange({ keepSmart: false, keepLast: 0, keepDays: value.keepDays || 30 });
    if (next === 'all') onChange({ keepSmart: false, keepLast: 0, keepDays: 0 });
  };

  const number = (key: 'keepLast' | 'keepDays', max: number): JSX.Element => (
    <Box sx={{ width: 120 }}>
      <InputBase
        name={`job-${key}`}
        type='number'
        value={String(value[key])}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          onChange({ ...value, [key]: Number.isNaN(n) ? 1 : Math.min(max, Math.max(1, n)) });
        }}
        margin='none'
      />
    </Box>
  );

  return (
    <>
      <Segmented
        testId='keep-mode'
        value={mode}
        onChange={pick}
        options={[
          { value: 'smart', label: locales.backup_keep_smart },
          { value: 'last', label: locales.backup_keep_last },
          { value: 'days', label: locales.backup_keep_days },
          { value: 'all', label: locales.backup_keep_all }
        ]}
      />

      {mode === 'smart' && (
        <Typography variant='caption' color='textSubdued'>
          {locales.backup_schedule_keep_smart_hint}
        </Typography>
      )}
      {mode === 'last' && number('keepLast', 10000)}
      {mode === 'days' && number('keepDays', 36500)}
      {mode === 'last' && value.keepDays > 0 && (
        <Typography variant='caption' color='textSubdued'>
          {locales.backup_keep_also_days.replace('{n}', String(value.keepDays))}
        </Typography>
      )}

      <Timeline cadence={cadence} retention={value} />

      <Typography variant='body2' data-testid='retention-result'>
        {mode === 'all'
          ? locales.backup_keep_result_all
          : locales.backup_keep_result_n.replace('{n}', String(kept)) +
            (lastSize > 0
              ? ` · ${locales.backup_keep_result_size.replace('{size}', formatSize(kept * lastSize))}`
              : '')}
      </Typography>
      {mode !== 'all' && (
        <Typography variant='caption' color='textSubdued' sx={{ mt: -1 }}>
          {locales.backup_keep_result_basis.replace('{days}', String(HORIZON_DAYS))}
        </Typography>
      )}
    </>
  );
}
