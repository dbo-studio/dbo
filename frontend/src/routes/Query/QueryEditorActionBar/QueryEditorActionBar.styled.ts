import { Stack, styled } from '@mui/material';

export const QueryEditorActionBarStackStyled = styled(Stack)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1),
  justifyContent: 'space-between',
  alignItems: 'center'
}));
