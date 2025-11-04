import { variables } from '@/core/theme/variables';
import { styled } from '@mui/material';

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

export const CellInput = styled('input')(({ theme }) => ({
  width: '100%',
  height: '22px',
  margin: 0,
  border: `1px solid ${theme.palette.primary.main}`,
  padding: '2px 8px',
  maxWidth: '100%',
  outline: 'none',
  boxSizing: 'border-box',
  background: theme.palette.background.default,
  color: theme.palette.text.text
}));

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
  backgroundColor: theme.palette.background.default,
  boxShadow: theme.palette.mode === 'dark' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
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
