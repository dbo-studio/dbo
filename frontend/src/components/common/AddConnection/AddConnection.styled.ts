import { Box, styled } from '@mui/material';

export const ConnectionFormContainerStyled = styled(Box)(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden'
}));

export const ConnectionFormBodyStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  paddingRight: theme.spacing(0.5)
}));

export const ConnectionFormFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  marginTop: theme.spacing(2),
  justifyContent: 'space-between',
  flexShrink: 0
}));

export const ConnectionFormCheckboxRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(1)
}));

export const SQLitePathRowStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'row',
  flex: 1,
  alignItems: 'center'
}));
