import { Box, styled } from '@mui/material';

export const LayoutStyled = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden'
}));

export const LayoutBodyStyled = styled(Box)(() => ({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden'
}));

export const LayoutMainStyled = styled(Box)(() => ({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden'
}));
