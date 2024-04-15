import { styled } from '@mui/material';

export const EmptySpaceStyle = styled('div')(({ theme }) => ({
  width: '100%',
  flex: 1,
  borderRight: `1px solid ${theme.palette.divider}`
}));
