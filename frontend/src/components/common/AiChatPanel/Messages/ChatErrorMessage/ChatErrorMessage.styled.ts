import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const ChatErrorMessageStyled = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  borderRadius: variables.radius.medium,
  border: `1px solid ${theme.palette.error.main}`,
  padding: theme.spacing(1)
}));
