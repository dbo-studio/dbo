import {
  checkboxBoxSize,
  muiCheckedCheckboxUrl,
  muiIndeterminateCheckboxUrl,
  muiUncheckedCheckboxUrl
} from '@/core/theme/checkboxAssets';
import { variables } from '@/core/theme/variables';
import { alpha, Box, styled, Typography } from '@mui/material';

export const SearchBarContainer = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.15)',
  padding: theme.spacing(0.5, 1),
  minWidth: theme.spacing(30),
  maxWidth: theme.spacing(40)
}));

export const HighlightedTextMatch = styled('span')(({ theme }) => ({
  '&.is-match': {
    backgroundColor: theme.palette.background.warning,
    fontWeight: 'bold'
  },
  '&.is-match.is-current-match': {
    color: theme.palette.text.warning
  }
}));

export const DataGridLoadingStyled = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flex: 1
}));

export const DataGridLoadingOverlayStyled = styled(Box)(({ theme }) => ({
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: theme.palette.background.default,
  opacity: 0.72
}));

export const SearchMatchCountStyled = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.subdued,
  fontSize: '12px',
  whiteSpace: 'nowrap'
}));

export const CellSelect = styled('select')(({ theme }) => ({
  width: '100%',
  height: '22px',
  margin: 0,
  border: `1px solid ${theme.palette.primary.main}`,
  borderRadius: variables.radius.small,
  padding: '0 4px',
  maxWidth: '100%',
  outline: 'none',
  boxSizing: 'border-box',
  background: theme.palette.background.default,
  color: theme.palette.text.text,
  fontSize: theme.typography.subtitle2.fontSize,
  cursor: 'pointer',
  '&:focus-visible': {
    boxShadow: `0 0 0 2px ${theme.palette.primary.main}33`
  }
}));

/** Circular hover/active bubble — same feel as MUI Checkbox ButtonBase (scaled for dense rows). */
export const GridCheckboxRoot = styled('label')(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 22,
  height: 22,
  margin: 0,
  padding: 0,
  borderRadius: '50%',
  verticalAlign: 'middle',
  cursor: 'pointer',
  transition: theme.transitions.create('background-color', {
    duration: theme.transitions.duration.shortest
  }),
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08)
  },
  '&:active': {
    backgroundColor: alpha(theme.palette.primary.main, 0.16)
  },
  '&:has(input:focus-visible)': {
    backgroundColor: alpha(theme.palette.primary.main, 0.12)
  },
  '&:has(input:disabled)': {
    cursor: 'not-allowed',
    opacity: 0.48,
    '&:hover': {
      backgroundColor: 'transparent'
    }
  }
}));

/** Native input painted with MUI Material checkbox glyphs. */
export const GridCheckboxInput = styled('input')(({ theme }) => {
  const color = theme.palette.primary.main;
  return {
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    margin: 0,
    padding: 0,
    width: checkboxBoxSize,
    height: checkboxBoxSize,
    flexShrink: 0,
    boxSizing: 'border-box',
    cursor: 'inherit',
    border: 0,
    backgroundColor: 'transparent',
    backgroundImage: muiUncheckedCheckboxUrl(color),
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'contain',
    '&:checked': {
      backgroundImage: muiCheckedCheckboxUrl(color)
    },
    '&:indeterminate': {
      backgroundImage: muiIndeterminateCheckboxUrl(color)
    },
    '&:focus': {
      outline: 'none'
    }
  };
});

export const HeaderBadgeStyled = styled('span')(({ theme }) => ({
  fontSize: 9,
  lineHeight: 1,
  padding: '1px 3px',
  borderRadius: 2,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.subdued,
  textTransform: 'uppercase',
  letterSpacing: 0.2
}));

export const FkLookupButton = styled('button')(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 18,
  height: 18,
  marginLeft: 4,
  padding: 0,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 2,
  background: theme.palette.background.paper,
  color: theme.palette.text.subdued,
  cursor: 'pointer',
  '&:hover': {
    color: theme.palette.text.text,
    borderColor: theme.palette.text.subdued
  }
}));

export const DataGridRootStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  width: '100%',
  position: 'relative'
}));
