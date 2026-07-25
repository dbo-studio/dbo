import { Box, styled } from '@mui/material';

export const SortsApplyBoxStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-start',
  marginLeft: theme.spacing(1),
  marginRight: theme.spacing(1),
  marginTop: theme.spacing(1)
}));
