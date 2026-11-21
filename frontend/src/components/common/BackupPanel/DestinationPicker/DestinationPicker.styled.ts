import { Box, styled } from '@mui/material';

export const DestinationGridStyled = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
  gap: theme.spacing(1)
}));