import { Box, styled } from '@mui/material';
import type { SortableDirection } from '../types';

export const SortableItemStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'direction'
})<{ direction: SortableDirection }>(({ direction }) => ({
  userSelect: 'none',
  touchAction: 'none',
  position: 'relative',
  flexShrink: 0,
  ...(direction === 'vertical' ? { width: '100%' } : {})
}));
