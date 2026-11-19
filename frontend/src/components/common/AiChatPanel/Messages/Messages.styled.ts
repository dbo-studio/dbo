import { Box, styled } from '@mui/material';

export const MessagesStyled = styled(Box)(({ theme }) => ({
  '--ai-chat-gap': theme.spacing(1.5),
  '--ai-chat-group-gap': theme.spacing(0.75),
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

/** Last user prompt (bubble or in-place editor) stays at the top while the answer scrolls. */
export const StickyComposerStyled = styled(Box)(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 3,
  backgroundColor: theme.palette.background.default,
  marginInline: theme.spacing(-0.5),
  paddingInline: theme.spacing(0.5),
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  boxShadow: `0 1px 0 ${theme.palette.divider}`
}));

export const ScrollToBottomButtonStyled = styled(Box)(({ theme }) => ({
  position: 'sticky',
  bottom: theme.spacing(1),
  alignSelf: 'center',
  zIndex: 2,
  marginTop: 'auto'
}));
