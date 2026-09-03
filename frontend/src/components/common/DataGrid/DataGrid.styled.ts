import {
  checkboxBoxSize,
  muiCheckedCheckboxUrl,
  muiIndeterminateCheckboxUrl,
  muiUncheckedCheckboxUrl
} from '@/core/theme/checkboxAssets';
import { variables } from '@/core/theme/variables';
import { alpha, Box, styled, Typography } from '@mui/material';

export const TableHeader = styled('th')(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.text,
  fontWeight: 'normal',
  fontSize: theme.typography.subtitle2.fontSize,
  position: 'relative',
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: '2px 8px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  boxSizing: 'border-box',

  WebkitTransform: 'translateZ(0)',
  transform: 'translateZ(0)'
}));

export const TableCell = styled('td')(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  height: '22px',
  boxSizing: 'border-box',
  color: theme.palette.text.text,
  fontSize: theme.typography.subtitle2.fontSize,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  WebkitTransform: 'translateZ(0)',
  transform: 'translateZ(0)',

  '.selected-highlight &': {
    backgroundColor: `${theme.palette.action.selected}`,
    color: theme.palette.text.text
  },

  '.removed-highlight &': {
    backgroundColor: `${theme.palette.background.danger} !important`,
    color: `${theme.palette.text.danger} !important`
  },

  '.unsaved-highlight &': {
    backgroundColor: `${theme.palette.background.success} !important`,
    color: `${theme.palette.text.success} !important`
  },

  '.edit-highlight &': {
    backgroundColor: `${theme.palette.background.warning} !important`,
    color: `${theme.palette.text.warning} !important`
  }
}));

export const StyledTable = styled('table')<{ width?: number | string }>(({ width }) => ({
  borderSpacing: 0,
  tableLayout: 'fixed',
  borderCollapse: 'separate',
  ...(width !== undefined && { width: typeof width === 'number' ? `${width}px` : width })
}));

export const StyledCol = styled('col')<{ width?: number }>(({ width }) => ({
  ...(width !== undefined && { width: `${width}px` })
}));

export const CellContent = styled('div')(() => ({
  width: '100%',
  height: '22px',
  cursor: 'pointer',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  willChange: 'contents',
  transition: 'background-color 0.1s ease'
}));

export const CellInput = styled('input')(({ theme }) => {
  const isDark = theme.palette.mode === 'dark';
  return {
    width: '100%',
    height: '22px',
    margin: 0,
    border: `1px solid ${theme.palette.primary.main}`,
    borderRadius: variables.radius.small,
    padding: '2px 8px',
    maxWidth: '100%',
    outline: 'none',
    boxSizing: 'border-box',
    background: theme.palette.background.default,
    color: theme.palette.text.text,
    colorScheme: isDark ? 'dark' : 'light',
    fontFamily: 'inherit',
    fontSize: theme.typography.subtitle2.fontSize
  };
});

export const TableContainer = styled('div')(() => ({
  width: '100%',
  height: '100%',
  overflow: 'auto',
  position: 'relative',
  overscrollBehavior: 'contain',
  userSelect: 'none',
  transform: 'translateZ(0)',
  willChange: 'scroll-position',
  WebkitOverflowScrolling: 'touch'
}));

export const StyledTableRow = styled('tr')(({ theme }) => ({
  '&.is-striped': {
    backgroundColor: theme.palette.background.subdued
  }
}));

export const StyledTableHead = styled('thead')(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 10,
  backgroundColor: theme.palette.background.default
}));

export const Resizer = styled('div')(({ theme }) => ({
  position: 'absolute',
  right: -3,
  top: 0,
  height: '100%',
  width: '5px',
  cursor: 'col-resize',
  userSelect: 'none',
  touchAction: 'none',
  zIndex: 100,
  WebkitTransform: 'translateZ(0)',
  transform: 'translateZ(0)',
  transition: 'background-color 0.1s ease, width 0.1s ease',
  '&:hover': {
    background: theme.palette.primary.main,
    opacity: 0.7,
    width: '8px'
  },
  '&.isResizing': {
    background: theme.palette.primary.main,
    opacity: 0.8,
    width: '5px'
  }
}));

export const CellContainer = styled('div')(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  textOverflow: 'ellipsis',
  padding: '2px 8px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  willChange: 'contents',
  userSelect: 'none',
  '.cell-hover &, .editing &': {
    userSelect: 'text'
  },
  '&.is-current-match': {
    backgroundColor: theme.palette.warning.main,
    color: theme.palette.warning.dark
  }
}));

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

export const SelectTableCell = styled('td')(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  height: '22px',
  boxSizing: 'border-box',
  color: theme.palette.text.text,
  fontSize: theme.typography.subtitle2.fontSize,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  width: '30px',
  minWidth: '30px',
  maxWidth: '30px',
  textAlign: 'center',
  verticalAlign: 'middle',
  WebkitTransform: 'translateZ(0)',
  transform: 'translateZ(0)',
  '.selected-highlight &': {
    backgroundColor: `${theme.palette.action.selected}`,
    color: theme.palette.text.text
  },
  '.removed-highlight &': {
    backgroundColor: `${theme.palette.background.danger} !important`,
    color: `${theme.palette.text.danger} !important`
  },
  '.unsaved-highlight &': {
    backgroundColor: `${theme.palette.background.success} !important`,
    color: `${theme.palette.text.success} !important`
  },
  '.edit-highlight &': {
    backgroundColor: `${theme.palette.background.warning} !important`,
    color: `${theme.palette.text.warning} !important`
  }
}));

export const SelectTableHeader = styled('th')(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.text,
  fontWeight: 'normal',
  fontSize: theme.typography.subtitle2.fontSize,
  position: 'relative',
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  boxSizing: 'border-box',
  minWidth: '30px',
  maxWidth: '30px',
  width: '30px',
  textAlign: 'center',
  verticalAlign: 'middle',
  WebkitTransform: 'translateZ(0)',
  transform: 'translateZ(0)'
}));

export const SortableTableHeader = styled(TableHeader)(() => ({
  cursor: 'pointer'
}));

export const PaddingTableCell = styled('td')<{ height?: number }>(({ height }) => ({
  padding: 0,
  border: 'none',
  ...(height !== undefined && { height: `${height}px` })
}));

export const VirtualTableWrapper = styled('div')<{ height?: number }>(({ height }) => ({
  position: 'relative',
  ...(height !== undefined && { height: `${height}px` })
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

export const CellNullStyled = styled('span')(({ theme }) => ({
  color: theme.palette.text.placeholder,
  fontStyle: 'italic',
  opacity: 0.85
}));

export const CellNumberStyled = styled('span')(() => ({
  display: 'block',
  width: '100%',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums'
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

export const FkCellView = styled('div')(() => ({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minWidth: 0,
  height: '22px'
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
