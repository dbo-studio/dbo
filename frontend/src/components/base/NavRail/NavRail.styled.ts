import { alpha, Box, styled } from '@mui/material';

export const NavRailStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'hideOnMobile' && prop !== 'fullWidth'
})<{ hideOnMobile?: boolean; fullWidth?: boolean }>(({ theme, hideOnMobile, fullWidth }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: fullWidth ? '100%' : 240,
  minWidth: fullWidth ? 0 : 240,
  maxWidth: fullWidth ? '100%' : 240,
  flex: fullWidth ? 1 : undefined,
  height: '100%',
  minHeight: 0,
  background: theme.palette.background.subdued,
  borderRight: fullWidth ? 'none' : `1px solid ${theme.palette.divider}`,
  ...(hideOnMobile
    ? {
        [theme.breakpoints.down('md')]: {
          display: 'none'
        }
      }
    : {})
}));

export const NavRailListStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  overflow: 'auto',
  flex: 1,
  minHeight: 0
}));

export const NavRailItemStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected'
})<{ selected?: boolean }>(({ theme, selected }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: `${theme.spacing(0.75)} ${theme.spacing(1)}`,
  marginBottom: theme.spacing(0.25),
  cursor: 'pointer',
  borderRadius: 4,
  borderLeft: `3px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
  background: selected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
  color: selected ? theme.palette.text.primary : theme.palette.text.text,
  textTransform: 'none',
  '&:hover': {
    background: selected ? alpha(theme.palette.primary.main, 0.14) : alpha(theme.palette.action.hover, 0.6)
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 1
  },
  h6: {
    color: 'inherit'
  },
  svg: {
    color: 'inherit',
    flexShrink: 0
  }
}));
