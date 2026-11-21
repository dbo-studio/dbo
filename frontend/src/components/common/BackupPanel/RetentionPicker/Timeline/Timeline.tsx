import { keptAges, type PlanCadence } from '@/core/backup/schedulePlan';
import locales from '@/locales';
import { Typography } from '@mui/material';
import { type JSX, useMemo } from 'react';
import type { Retention } from '../RetentionPicker';
import { TimelineCellStyled, TimelineLabelsStyled, TimelineStripStyled } from './Timeline.styled';

const STRIP_DAYS = 60;

/** One cell per day, filled when a backup from that day would still exist. */
export default function Timeline({ cadence, retention }: { cadence: PlanCadence; retention: Retention }): JSX.Element {
  const ages = useMemo(() => keptAges(cadence, retention), [cadence, retention]);
  const cells = useMemo(() => {
    const filled = new Set(ages.map((a) => Math.floor(a)));
    return Array.from({ length: STRIP_DAYS }, (_, d) => filled.has(d));
  }, [ages]);

  return (
    <div aria-hidden data-testid='retention-timeline'>
      <TimelineStripStyled>
        {cells.map((kept, d) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the strip is fixed, one cell per day
          <TimelineCellStyled key={d} kept={kept} />
        ))}
      </TimelineStripStyled>
      <TimelineLabelsStyled>
        <Typography variant='caption' color='textSubdued'>
          {locales.backup_keep_today}
        </Typography>
        <Typography variant='caption' color='textSubdued'>
          {locales.backup_keep_days_ago.replace('{n}', String(STRIP_DAYS))}
        </Typography>
      </TimelineLabelsStyled>
    </div>
  );
}