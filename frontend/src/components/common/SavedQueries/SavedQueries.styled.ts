import { Box, Stack, styled } from '@mui/material';

export const SavedQueriesContainerStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0
}));

export const SavedQueriesToolbarStyled = styled(Stack)(() => ({
  alignContent: 'center',
  justifyContent: 'center',
  alignItems: 'center'
}));

export const SavedQueriesListStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  flex: 1,
  minHeight: 0,
  overflow: 'auto'
}));

export const SavedQueriesLoadMoreStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  justifyContent: 'center',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2)
}));
