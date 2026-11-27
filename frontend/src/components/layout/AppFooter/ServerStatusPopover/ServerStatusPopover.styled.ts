import { Box, styled } from '@mui/material';

export const ServerStatusRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  padding: theme.spacing(0.5, 1.5),
  '&:last-of-type': { paddingBottom: theme.spacing(1.25) }
}));
