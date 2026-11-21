import { Box, Chip, Typography, styled } from '@mui/material';

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

/** One user prompt plus the answer that follows it; sticky is clipped to this box. */
export const StickyTurnStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--ai-chat-gap)',
  width: '100%'
}));

/** User prompt (bubble or in-place editor) stays at the top while that turn's answer scrolls. */
export const StickyComposerStyled = styled(Box)(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 3,
  backgroundColor: theme.palette.background.default,
  marginInline: theme.spacing(-0.5),
  paddingInline: theme.spacing(0.5),
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1)
}));

export const ScrollToBottomButtonStyled = styled(Box)(({ theme }) => ({
  position: 'sticky',
  bottom: theme.spacing(1),
  alignSelf: 'center',
  zIndex: 2,
  marginTop: 'auto'
}));

export const LoadingRowStyled = styled(MessageGroupStyled)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1),
  paddingLeft: theme.spacing(0.5)
}));

export const LoadMoreStyled = styled(Typography)(({ theme }) => ({
  alignSelf: 'center',
  marginBottom: theme.spacing(1),
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  textDecoration: 'underline',
  font: 'inherit',
  color: theme.palette.primary.main
}));

export const JumpChipStyled = styled(Chip)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[2],
  '&:hover': {
    backgroundColor: theme.palette.background.paper
  }
}));
