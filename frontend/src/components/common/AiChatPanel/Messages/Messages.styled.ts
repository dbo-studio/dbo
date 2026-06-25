import { Box, styled } from '@mui/material';

export const MessagesStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  position: 'relative',
  padding: `${theme.spacing(1)} ${theme.spacing(0.5)}`,
  scrollPaddingBottom: theme.spacing(2)
}));

export const MessagesListStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
  width: '100%'
}));

export const MessageGroupStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.75),
  width: '100%'
}));

export const ScrollToBottomButtonStyled = styled(Box)(({ theme }) => ({
  position: 'sticky',
  bottom: theme.spacing(1),
  alignSelf: 'center',
  zIndex: 2,
  marginTop: 'auto'
}));
