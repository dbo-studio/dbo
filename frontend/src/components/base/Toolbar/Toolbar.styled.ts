import { Box, styled } from '@mui/material';

/** A tab's action bar, like the SQL editor's: context controls on the left, icon actions pushed right. */
export const ToolbarStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: theme.spacing(1, 2),
  padding: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  flexShrink: 0
}));

export const ToolbarSpacerStyled = styled(Box)({ flex: 1 });
