import { Box, styled } from '@mui/material';

export const ConnectionsStyled = styled(Box)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: theme.palette.background.subdued,
  minWidth: '83px'
}));
