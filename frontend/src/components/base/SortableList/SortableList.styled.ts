import { Box, styled } from '@mui/material';

type SortableListContainerStyledProps = {
  direction: 'horizontal' | 'vertical';
};

export const SortableListContainerStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'direction'
})<SortableListContainerStyledProps>(({ direction }) => ({
  display: 'flex',
  flexDirection: direction === 'horizontal' ? 'row' : 'column',
  touchAction: direction === 'horizontal' ? 'pan-x' : 'pan-y',
  contain: 'layout style'
}));
