import { Box, styled } from '@mui/material';

export const ConnectionFormContainerStyled = styled(Box)(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column'
}));

export const ConnectionFormFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  marginTop: theme.spacing(2),
  justifyContent: 'space-between'
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
