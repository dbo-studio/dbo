import { Stack } from '@mui/material';
import { styled } from '@mui/material/styles';

export const ChatContextStyled = styled(Stack)(({ theme }) => ({
  width: '200px',
  height: '200px',
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: 'none',
  zIndex: 1000,
  overflow: 'auto'
}));
