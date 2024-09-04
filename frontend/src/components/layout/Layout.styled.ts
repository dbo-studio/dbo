import { Box, styled } from '@mui/material';

export const LayoutStyled = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden'
}));
