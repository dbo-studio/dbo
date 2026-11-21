import { styled } from '@mui/material';

export const TreeRowPosition = styled('div', {
  shouldForwardProp: (prop): boolean => prop !== 'top'
})<{ top: number }>(({ top }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  transform: `translateY(${top}px)`
}));