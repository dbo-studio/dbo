import { Box, styled } from '@mui/material';

export const AdministrationModalContainerStyled = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column'
})) as typeof Box;

export const AdministrationModalContentStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  marginTop: theme.spacing(1)
}));
