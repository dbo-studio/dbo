import { Box, styled } from '@mui/material';

export const MobileConnectionsStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
  background: theme.palette.background.subdued,
  height: '100%',
  display: 'flex',
  flexDirection: 'column'
}));
