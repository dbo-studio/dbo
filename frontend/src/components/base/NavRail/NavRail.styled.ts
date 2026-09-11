import { alpha, Box, styled } from '@mui/material';

export const NavRailStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'hideOnMobile'
})<{ hideOnMobile?: boolean }>(({ theme, hideOnMobile }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: 240,
  minWidth: 240,
  maxWidth: 240,
  height: '100%',
  minHeight: 0,
  background: theme.palette.background.subdued,
  borderRight: `1px solid ${theme.palette.divider}`,
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
