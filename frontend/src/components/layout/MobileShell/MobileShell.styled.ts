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

/** Body for screens that host sidebar-style lists (queries, history): those bring no side padding of their own. */
export const ScreenContentStyled = styled(ScreenBodyStyled)(({ theme }) => ({
  padding: theme.spacing(0, 1.5),
  // The "Load more" button is a full-width call to action in the sidebar; keep it compact on phones.
  '& .MuiButton-contained': {
    minHeight: 32
  }
}));
