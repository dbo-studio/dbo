import { variables } from '@/core/theme/variables';
import { alpha, Box, keyframes, styled } from '@mui/material';

const rise = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
`;

export const ExplanationMessageStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$isUser'
})<{ $isUser: boolean }>(({ theme, $isUser }) => ({
  alignSelf: 'stretch',
  width: '100%',
  maxWidth: '100%',
  display: $isUser ? 'flex' : 'block',
  alignItems: $isUser ? 'center' : undefined,
  gap: $isUser ? theme.spacing(1) : undefined,
  backgroundColor: $isUser
    ? theme.palette.mode === 'light'
      ? alpha(theme.palette.common.black, 0.04)
      : alpha(theme.palette.common.white, 0.06)
    : 'transparent',
  borderRadius: $isUser ? variables.radius.medium : 0,
  border: $isUser ? `1px solid ${theme.palette.divider}` : 'none',
  padding: $isUser ? theme.spacing(1, 1.5) : theme.spacing(0.25, 0.25, 0.5),
  color: theme.palette.text.text,
  minWidth: 0,

  '& *': {
    userSelect: 'text',
    WebkitUserSelect: 'text',
    msUserSelect: 'text'
  }
}));

/** A message the user just sent eases in; older ones appear as they are. */
export const UserMessageRowStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$isNew'
})<{ $isNew?: boolean }>(({ $isNew }) => ({
  animation: $isNew ? `${rise} 200ms ease-out` : undefined,
  display: 'flex',
  width: '100%',
  minWidth: 0
}));

export const UserMessageEditStyled = styled(Box)(({ theme }) => ({
  flexShrink: 0,
  display: 'inline-flex',
  color: theme.palette.text.secondary,
  '& .MuiIconButton-root': {
    width: variables.control,
    height: variables.control,
    padding: 0
  }
}));
