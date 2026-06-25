import { Box, Stack, styled } from '@mui/material';

export const QueryEditorActionBarStackStyled = styled(Stack)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1),
  justifyContent: 'space-between',
  alignItems: 'center'
}));

export const QueryEditorActionBarBoxStyled = styled(Box)(({ isCompact }: { isCompact: boolean }) => ({
  display: 'flex',
  justifyContent: 'flex-start',
  minWidth: 0,
  width: isCompact ? '100%' : 'auto',
  flex: isCompact ? undefined : 1
}));

export const QueryEditorActionBarActionsBoxStyled = styled(Box)(({ isCompact }: { isCompact: boolean }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  overflowX: 'auto',
  width: isCompact ? '100%' : 'auto',
  flexShrink: 0
}));
