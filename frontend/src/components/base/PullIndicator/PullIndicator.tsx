import { CircularProgress } from '@mui/material';
import type { JSX } from 'react';
import { PullIndicatorStyled } from './PullIndicator.styled';

export default function PullIndicator({ pull, progress }: { pull: number; progress: number }): JSX.Element | null {
  if (pull === 0) {
    return null;
  }

  return (
    <PullIndicatorStyled style={{ height: pull }} data-testid='pull-indicator'>
      <CircularProgress variant='determinate' size={20} value={progress * 100} />
    </PullIndicatorStyled>
  );
}
