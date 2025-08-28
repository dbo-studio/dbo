import { variables } from '@/core/theme/variables';
import { Stack } from '@mui/material';
import { styled } from '@mui/material/styles';

export const ChatContextStyled = styled(Stack)(({ theme }) => ({
  width: '200px',
  height: '200px',
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.default,
  boxShadow: 'none',
  zIndex: 1000,
  overflow: 'auto'
}));
