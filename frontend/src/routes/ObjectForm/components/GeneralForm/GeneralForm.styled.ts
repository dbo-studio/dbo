import { Box, styled } from '@mui/material';

export const GeneralFormStyled = styled(Box)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1)
}));
