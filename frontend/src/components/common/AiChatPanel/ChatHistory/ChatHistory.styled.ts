import { variables } from '@/core/theme/variables';
import { Stack, styled } from '@mui/material';

export const ChatHistoryStyled = styled(Stack)(({ theme }) => ({
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

export const ChatHistoryItemStyled = styled(Stack)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  borderRadius: variables.radius.medium,
  padding: '0 4px',
  border: '1px solid transparent',
  ':hover': {
    border: `1px solid ${theme.palette.divider}`
  }
}));
