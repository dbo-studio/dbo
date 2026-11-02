import { Box, styled } from '@mui/material';

export const TextValueHeaderStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  flexShrink: 0
}));
