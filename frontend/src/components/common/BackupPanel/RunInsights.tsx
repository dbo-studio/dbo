import { variables } from '@/core/theme/variables';
import type { BackupArtifactType } from '@/api/backup/types';
import locales from '@/locales';
import { Box, Typography } from '@mui/material';
import type { JSX } from 'react';
import { formatSize } from './format';

const WINDOW = 30;

const average = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

const secondsOf = (run: BackupArtifactType): number =>
  run.completedAt ? Math.max(0, (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000) : 0;

/** Numbers over the newest runs. Runs still in progress say nothing yet, so they are left out. */
export const summarizeRuns = (
  runs: BackupArtifactType[]
): { total: number; succeeded: number; avgSize: number; avgSeconds: number; sizes: number[] } => {
  const finished = runs.filter((r) => r.status !== 'running').slice(0, WINDOW);
  const done = finished.filter((r) => r.status === 'completed');
  return {
    total: finished.length,
    succeeded: done.length,
    avgSize: average(done.map((r) => r.size)),
    avgSeconds: average(done.map(secondsOf)),
    // oldest first, so the line reads left to right through time
    sizes: done.map((r) => r.size).reverse()
  };
};

function Sparkline({ values }: { values: number[] }): JSX.Element | null {
  if (values.length < 2) return null;
  const [w, h] = [120, 28];
  const [min, max] = [Math.min(...values), Math.max(...values)];
  const points = values
    .map(
      (v, i) => `${(i / (values.length - 1)) * w},${max === min ? h / 2 : h - 2 - ((v - min) / (max - min)) * (h - 4)}`
    )
    .join(' ');
  return (
    <Box component='svg' viewBox={`0 0 ${w} ${h}`} width={w} height={h} sx={{ color: 'primary.main' }} aria-hidden>
      <polyline points={points} fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round' />
    </Box>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }): JSX.Element {
  return (
    <Box>
      <Typography variant='caption' color='textSubdued' component='p'>
        {label}
      </Typography>
      <Typography variant='body2' sx={{ color: tone }}>
        {value}
      </Typography>
    </Box>
  );
}

/** Success rate, typical size and duration, and the size trend of a schedule's recent runs. */
export default function RunInsights({ runs }: { runs: BackupArtifactType[] }): JSX.Element | null {
  const s = summarizeRuns(runs);
  if (s.total === 0) return null;

  const rate = Math.round((s.succeeded / s.total) * 100);

  return (
    <Box
      data-testid='backup-insights'
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        mb: 2,
        p: 1.5,
        bgcolor: 'action.hover',
        borderRadius: variables.radius.small
      }}
    >
      <Stat
        label={locales.backup_insights_success.replace('{count}', String(s.total))}
        value={`${rate}%`}
        tone={rate === 100 ? 'success.main' : rate >= 80 ? 'warning.main' : 'error.main'}
      />
      <Stat label={locales.backup_insights_avg_size} value={formatSize(s.avgSize)} />
      <Stat label={locales.backup_insights_avg_duration} value={`${Math.round(s.avgSeconds)}s`} />
      <Box>
        <Typography variant='caption' color='textSubdued' component='p'>
          {locales.backup_insights_trend}
        </Typography>
        <Sparkline values={s.sizes} />
      </Box>
    </Box>
  );
}
