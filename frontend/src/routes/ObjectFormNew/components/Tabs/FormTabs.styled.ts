import { styled } from '@mui/material';

export const FormTabsStyled = styled('div')(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(1)
}));
