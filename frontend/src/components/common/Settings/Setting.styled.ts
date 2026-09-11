import { alpha, Box, Grid, InputBase, styled } from '@mui/material';

export const SettingsRootStyled = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  height: '100%',
  minHeight: 0,
  width: '100%',
  overflow: 'hidden',
  borderTop: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.default,
  [theme.breakpoints.down('md')]: {
    flexDirection: 'column'
  }
}));

export const SettingsRailSearchStyled = styled(Box)(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  padding: theme.spacing(1.5),
  background: theme.palette.background.subdued,
  borderBottom: `1px solid ${theme.palette.divider}`
}));

export const SettingsSearchInputStyled = styled(InputBase)(({ theme }) => ({
  width: '100%',
  fontSize: 13,
  padding: `${theme.spacing(0.75)} ${theme.spacing(1)}`,
  borderRadius: 4,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.default,
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.35)}`
  }
}));

export const SettingsContentPaneStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  overflow: 'auto',
  background: theme.palette.background.default,
  padding: theme.spacing(2)
}));

export const SettingsContentInnerStyled = styled(Box)(() => ({
  maxWidth: 720,
  width: '100%'
}));

export const SettingsResultListStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5)
}));

export const SettingsResultItemStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active'
})<{ active?: boolean }>(({ theme, active }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: theme.spacing(1, 1.25),
  borderRadius: 4,
  cursor: 'pointer',
  background: active ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
  border: `1px solid ${active ? alpha(theme.palette.primary.main, 0.35) : 'transparent'}`,
  '&:hover': {
    background: alpha(theme.palette.primary.main, 0.08)
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1
  }
}));

/** @deprecated kept for any leftover imports during migration */
export const SettingsContentStyled = styled(Grid)(() => ({
  maxHeight: 'none',
  overflow: 'auto',
  minHeight: 0
})) as typeof Grid;

export const SettingsContentGridStyled = styled(Grid, {
  shouldForwardProp: (prop) => prop !== 'isMobile'
})(({ isMobile }: { isMobile: boolean }) => ({
  width: '100%',
  maxWidth: '100%',
  height: isMobile ? '100%' : undefined,
  flex: 1,
  minHeight: 0,
  overflow: 'hidden'
}));
