import { Box, styled, SwipeableDrawer } from '@mui/material';
import type { BottomSheetStyledProps } from './types';

const SHEET_MAX_HEIGHT = 'calc(100dvh - env(safe-area-inset-top) - 24px)';

export const BottomSheetStyled = styled(SwipeableDrawer, {
  shouldForwardProp: (prop) => prop !== 'fullHeight'
})<BottomSheetStyledProps>(({ fullHeight }) => ({
  '& .MuiDrawer-paper': {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: SHEET_MAX_HEIGHT,
    height: fullHeight ? SHEET_MAX_HEIGHT : 'auto',
    paddingBottom: 'env(safe-area-inset-bottom)',
    display: 'flex',
    flexDirection: 'column'
  }
}));

export const BottomSheetHandleStyled = styled(Box)(({ theme }) => ({
  width: 36,
  height: 4,
  borderRadius: 2,
  backgroundColor: theme.palette.divider,
  margin: `${theme.spacing(1)} auto 0`,
  flexShrink: 0
}));

export const BottomSheetHeaderStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1.5, 2)
}));

export const BottomSheetContentStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: theme.spacing(0, 2, 2)
}));
