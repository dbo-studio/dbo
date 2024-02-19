import { variables } from '@/src/core/theme/variables';
import { Box, styled } from '@mui/material';

export const ConnectionWrapperStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing(1),
  marginTop: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium
}));
