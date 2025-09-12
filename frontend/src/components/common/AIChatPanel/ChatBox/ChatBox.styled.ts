import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const ChatBoxStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
  width: '100%',
  marginTop: theme.spacing(1),
  maxHeight: '300px'
}));
