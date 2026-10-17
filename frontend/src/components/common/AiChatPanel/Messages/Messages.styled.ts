import { Box, styled } from '@mui/material';

export const MessagesStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'compact'
})<{ compact?: boolean }>(({ theme, compact }) => ({
  '--ai-chat-gap': theme.spacing(compact ? 0.75 : 1.5),
  '--ai-chat-group-gap': theme.spacing(compact ? 0.25 : 0.75),
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  position: 'relative',
  padding: `${theme.spacing(1)} ${theme.spacing(0.5)}`,
  scrollPaddingBottom: theme.spacing(2)
}));

export const MessagesListStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--ai-chat-gap)',
  width: '100%'
}));

export const MessageGroupStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--ai-chat-group-gap)',
  width: '100%'
}));

export const ScrollToBottomButtonStyled = styled(Box)(({ theme }) => ({
  position: 'sticky',
  bottom: theme.spacing(1),
  alignSelf: 'center',
  zIndex: 2,
  marginTop: 'auto'
}));
