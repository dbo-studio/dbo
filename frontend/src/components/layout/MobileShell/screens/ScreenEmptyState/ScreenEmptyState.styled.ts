import { Box, styled } from '@mui/material';

export const ScreenEmptyStateStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(3)
}));

// EmptyState grows to fill flex parents; a block wrapper keeps it sized to its content.
export const ScreenEmptyStateContentStyled = styled(Box)({
  display: 'block'
});
