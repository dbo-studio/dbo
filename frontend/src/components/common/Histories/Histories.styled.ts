import { Box, Stack, styled } from '@mui/material';

export const HistoriesContainerStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0
}));

export const HistoriesToolbarStyled = styled(Stack)(() => ({
  alignContent: 'center',
  justifyContent: 'center',
  alignItems: 'center'
}));

export const HistoriesListStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  flex: 1,
  minHeight: 0,
  overflow: 'auto'
}));

export const HistoriesLoadMoreStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2)
}));
