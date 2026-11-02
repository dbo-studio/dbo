import { Typography } from '@mui/material';
import type { JSX } from 'react';
import {
  ProgressBarCaptionStyled,
  ProgressBarFillStyled,
  ProgressBarRootStyled,
  ProgressBarTrackStyled
} from './ProgressBar.styled';
import type { ProgressBarProps } from './types';

export default function ProgressBar({
  value,
  status = 'active',
  label,
  detail,
  testId
}: ProgressBarProps): JSX.Element {
  const indeterminate = value === undefined && status === 'active';
  const pct = Math.min(100, Math.max(0, status === 'success' ? 100 : (value ?? 0)));

  return (
    <ProgressBarRootStyled data-testid={testId}>
      <ProgressBarTrackStyled
        role='progressbar'
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : Math.round(pct)}
      >
        <ProgressBarFillStyled
          status={status}
          indeterminate={indeterminate}
          style={indeterminate ? undefined : { width: `${pct}%` }}
        />
      </ProgressBarTrackStyled>
      {(label || detail) && (
        <ProgressBarCaptionStyled>
          <Typography variant='caption' color={status === 'error' ? 'error' : 'textText'} noWrap>
            {label}
          </Typography>
          <Typography variant='caption' color='textSecondary' noWrap>
            {detail}
          </Typography>
        </ProgressBarCaptionStyled>
      )}
    </ProgressBarRootStyled>
  );
}
