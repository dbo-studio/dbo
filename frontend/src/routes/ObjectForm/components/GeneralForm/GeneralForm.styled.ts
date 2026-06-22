import { Box, Stack, styled } from '@mui/material';

export const GeneralFormStyled = styled(Box)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1)
}));

export const GeneralFormFieldsStackStyled = styled(Stack)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
  alignItems: 'center'
}));
