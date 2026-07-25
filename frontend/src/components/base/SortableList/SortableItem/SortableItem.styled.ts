import { Box, styled } from '@mui/material';

export const SortableItemStyled = styled(Box)({
  userSelect: 'none',
  touchAction: 'none',
  willChange: 'transform',
  position: 'relative'
});
