import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const ExplanationMessageStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$isUser'
})<{ $isUser: boolean }>(({ theme, $isUser }) => ({
  alignSelf: $isUser ? 'flex-end' : 'flex-start',
  maxWidth: $isUser ? '90%' : '100%',
  backgroundColor: $isUser ? theme.palette.action.selected : 'transparent',
  borderRadius: variables.radius.medium,
  border: $isUser ? `1px solid ${theme.palette.divider}` : 'none',
  padding: $isUser ? `${theme.spacing(0.75)} ${theme.spacing(1)}` : `${theme.spacing(0.25)} 0`,
  color: theme.palette.text.text,

  '& *': {
    userSelect: 'text',
    WebkitUserSelect: 'text',
    msUserSelect: 'text'
  }
}));

export const UserMessageActionsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(0.5),
  opacity: 0,
  transition: 'opacity 0.15s ease',
  flexShrink: 0
}));

export const UserMessageRowStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'flex-end',
  gap: 4,
  width: '100%',
  '&:hover .user-message-actions': {
    opacity: 1
  }
}));
