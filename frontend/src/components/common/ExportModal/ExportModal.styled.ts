import { Box, styled } from '@mui/material';

export const ExportModalContainerStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1
})) as typeof Box;

export const ExportModalPathRowStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  display: 'flex',
  alignItems: 'center'
}));

export const ExportModalFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  marginTop: theme.spacing(2),
  justifyContent: 'space-between'
}));
