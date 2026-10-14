import { Box, styled } from '@mui/material';
import type { TabPaneStyledProps } from './types';

export const MobileShellStyled = styled(Box)(({ theme }) => ({
  height: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
  paddingTop: 'env(safe-area-inset-top)',
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)'
}));

export const TabPaneStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active'
})<TabPaneStyledProps>(({ active }) => ({
  flex: 1,
  minHeight: 0,
  display: active ? 'flex' : 'none',
  flexDirection: 'column'
}));

export const ScreenBodyStyled = styled(Box)({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column'
});
