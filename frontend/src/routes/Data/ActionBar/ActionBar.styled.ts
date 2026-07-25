import Grid, { GridItem } from '@/components/base/Grid/Grid';
import { styled } from '@mui/material';

export const ActionBarGridStyled = styled(Grid)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1),
  minHeight: 40,
  gap: theme.spacing(1)
}));

export const ActionBarActionsGridItemStyled = styled(GridItem)(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  flexWrap: 'nowrap',
  flexShrink: 0,
  gap: 0.5
}));
