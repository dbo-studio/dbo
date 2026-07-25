import { Box, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const ConnectionSelectionContainerStyled = styled(Box)(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column'
}));

export const ConnectionWrapperStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: '10px',
  padding: theme.spacing(1),
  marginTop: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  minHeight: 97
})) as typeof Box;
