import { Box, styled } from '@mui/material';

export const ExportModalContainerStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0
})) as typeof Box;

export const ExportModalPathRowStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  display: 'flex',
  alignItems: 'center'
}));
