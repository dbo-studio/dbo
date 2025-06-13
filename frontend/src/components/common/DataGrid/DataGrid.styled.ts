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
  minWidth: '200px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',

  WebkitTransform: 'translateZ(0)',
  transform: 'translateZ(0)',
  transition: 'width 0.1s ease'
}));

export const TableCell = styled('td')(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  height: '22px',
  boxSizing: 'border-box',
  color: theme.palette.text.text,
  fontSize: theme.typography.subtitle2.fontSize,
  minWidth: '200px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  WebkitTransform: 'translateZ(0)',
  transform: 'translateZ(0)',
  transition: 'width 0.1s ease',

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

export const StyledTable = styled('table')(({ theme }) => ({
  width: 'max-content',
  borderSpacing: 0,
  tableLayout: 'fixed',
  borderCollapse: 'separate'
}));

export const CellContent = styled('div')(({ theme }) => ({
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

export const TableContainer = styled('div')(({ theme }) => ({
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
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.background.subdued
  }
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
  }
}));

export const EditButton = styled('button')(({ theme }) => ({
  position: 'absolute',
  right: '2px',
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  border: 'none',
  borderRadius: '3px',
  width: '20px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  opacity: 0,
  transition: 'opacity 0.2s',
  '&:hover': {
    opacity: 1
  },
  '.cell-hover &': {
    opacity: 0.7
  }
}));
