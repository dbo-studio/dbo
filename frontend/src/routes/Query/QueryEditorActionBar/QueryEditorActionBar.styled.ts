import { Box, Stack, styled } from '@mui/material';

// Wraps by container width (not viewport), so a narrow editor panel stacks actions under the context selects.
export const QueryEditorActionBarStackStyled = styled(Stack)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1),
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing(1),
  flexShrink: 0
}));

export const QueryEditorActionBarBoxStyled = styled(Box)({
  display: 'flex',
  justifyContent: 'flex-start',
  minWidth: 0,
  flex: '1 1 auto'
});

export const QueryEditorActionBarActionsBoxStyled = styled(Box)({
  display: 'flex',
  justifyContent: 'flex-end',
  marginLeft: 'auto',
  flexShrink: 0
});
