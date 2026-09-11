import { Box, styled } from '@mui/material';

type SortableListContainerStyledProps = {
  direction: 'horizontal' | 'vertical';
};

export const SortableListContainerStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'direction'
})<SortableListContainerStyledProps>(({ direction }) => ({
  display: 'flex',
  flexDirection: direction === 'horizontal' ? 'row' : 'column',
  flexShrink: 0,
  width: direction === 'vertical' ? '100%' : undefined,
  touchAction: direction === 'horizontal' ? 'pan-x' : 'pan-y'
}));

export const SortableOverlayStyled = styled(Box)({
  cursor: 'grabbing',
  pointerEvents: 'none'
});
