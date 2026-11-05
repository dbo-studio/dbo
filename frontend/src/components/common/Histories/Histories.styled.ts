import { Box, Stack, styled } from '@mui/material';

export const HistoriesContainerStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 1.5),
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0
}));

export const HistoriesToolbarStyled = styled(Stack)(() => ({
  alignItems: 'center',
  flexShrink: 0
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
