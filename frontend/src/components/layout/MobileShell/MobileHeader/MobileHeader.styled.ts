import { Box, ButtonBase, styled } from '@mui/material';
import type { ConnectionStatusStyledProps } from '../types';

export const MobileHeaderStyled = styled('header')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  flexShrink: 0,
  minHeight: 56,
  padding: theme.spacing(0.5, 0.5, 0.5, 1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default
}));

export const ConnectionSwitcherStyled = styled(ButtonBase)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  minHeight: 44,
  justifyContent: 'flex-start',
  gap: theme.spacing(1.25),
  padding: theme.spacing(0.5, 1),
  borderRadius: 5,
  textAlign: 'start',
  '&:active': {
    backgroundColor: theme.palette.action.hover
  }
}));

export const ConnectionIconStyled = styled(Box)({
  position: 'relative',
  display: 'flex',
  flexShrink: 0
});

// Status colors follow the desktop ConnectionBox: warning while connecting, danger on error.
export const ConnectionStatusDotStyled = styled('span', {
  shouldForwardProp: (prop) => prop !== 'status'
})<ConnectionStatusStyledProps>(({ theme, status }) => ({
  position: 'absolute',
  right: -2,
  bottom: -2,
  width: 10,
  height: 10,
  borderRadius: '50%',
  border: `2px solid ${theme.palette.background.default}`,
  backgroundColor:
    (status === 'connected' && theme.palette.success.main) ||
    (status === 'loading' && theme.palette.warning.main) ||
    (status === 'error' && theme.palette.error.main) ||
    theme.palette.text.disabled
}));

export const ConnectionTextStyled = styled(Box)({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column'
});

export const ConnectionNameStyled = styled('span')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  fontSize: 15,
  lineHeight: '20px',
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.text.title,
  minWidth: 0,
  '& > span': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  svg: {
    flexShrink: 0,
    color: theme.palette.text.subdued
  }
}));

export const ConnectionMetaStyled = styled('span')(({ theme }) => ({
  fontFamily: theme.editorFontFamily,
  fontSize: 11,
  lineHeight: '14px',
  color: theme.palette.text.subdued,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}));
