import type { BackupArtifactType } from '@/api/backup/types';
import locales from '@/locales';
import { Box, Typography } from '@mui/material';
import type { JSX } from 'react';
import { formatSize } from '../format';
import { RunInsightsRootStyled } from './RunInsights.styled';
import Sparkline from './Sparkline/Sparkline';
import Stat from './Stat/Stat';
import { summarizeRuns } from './runInsightsUtils';

/** Success rate, typical size and duration, and the size trend of a schedule's recent runs. */
export default function RunInsights({ runs }: { runs: BackupArtifactType[] }): JSX.Element | null {
  const s = summarizeRuns(runs);
  if (s.total === 0) return null;

  const rate = Math.round((s.succeeded / s.total) * 100);

  return (
    <RunInsightsRootStyled data-testid='backup-insights'>
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
    </RunInsightsRootStyled>
  );
}