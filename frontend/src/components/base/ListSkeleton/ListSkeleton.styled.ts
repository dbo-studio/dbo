import { Box, styled } from '@mui/material';

export const ListSkeletonRowStyled = styled(Box)(({ theme }) => ({
  minHeight: 48,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(0.75, 2),
  borderBottom: `1px solid ${theme.palette.divider}`
}));
