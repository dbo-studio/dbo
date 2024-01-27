import { Box, styled } from '@mui/material';

export const AddConnectionStyled = styled(Box)(() => ({
  position: 'fixed',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 99,
  background: 'rgba(228, 228, 228, 0.50)',
  backdropFilter: 'blur(2px)'
}));
