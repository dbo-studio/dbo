import { Box, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const ConnectionSelectionContainerStyled = styled(Box)(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  width: 'min(480px, calc(100vw - 64px))'
}));

export const ConnectionSelectionBodyStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  marginTop: theme.spacing(1)
}));

/** 4-up grid; scrolls when the list is taller than ~3 rows. */
export const ConnectionWrapperStyled = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  marginTop: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  maxHeight: 280,
  overflowY: 'auto',
  overflowX: 'hidden',
  alignContent: 'start'
})) as typeof Box;

export const ConnectionSelectionFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  flexShrink: 0,
  marginTop: theme.spacing(2)
}));
