import EmptyState from '@/components/base/EmptyState/EmptyState';
import { Button } from '@mui/material';
import type { JSX } from 'react';
import type { ScreenEmptyStateProps } from '../../types';
import { ScreenEmptyStateContentStyled, ScreenEmptyStateStyled } from './ScreenEmptyState.styled';

export default function ScreenEmptyState({ icon, message, actionLabel, onAction }: ScreenEmptyStateProps): JSX.Element {
  return (
    <ScreenEmptyStateStyled>
      <ScreenEmptyStateContentStyled>
        <EmptyState icon={icon} title={message} />
      </ScreenEmptyStateContentStyled>
      {actionLabel && onAction && (
        <Button variant='contained' onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </ScreenEmptyStateStyled>
  );
}
