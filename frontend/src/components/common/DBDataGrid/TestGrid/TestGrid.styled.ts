import { styled } from '@mui/material';

export const TableHeader = styled('th')(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.text,
  fontWeight: 'normal',
  fontSize: theme.typography.subtitle2.fontSize,
  position: 'relative',
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: '2px 8px'
}));

export const TableCell = styled('td')(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  height: '22px',
  boxSizing: 'border-box',
  padding: '2px 8px',
  color: theme.palette.text.text,
  fontSize: theme.typography.subtitle2.fontSize,

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
  width: '100%',
  borderSpacing: 0
}));

export const CellContent = styled('div')(({ theme }) => ({
  width: '100%',
  height: '22px',
  cursor: 'pointer'
}));

export const CellInput = styled('input')(({ theme }) => ({
  width: '100%',
  height: '22px',
  maxWidth: '100%',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  outline: 'none',
  boxSizing: 'border-box'
}));

export const TableContainer = styled('div')(({ theme }) => ({
  width: '100%'
}));

export const StyledTableRow = styled('tr')(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.background.subdued
  }
}));

export const Resizer = styled('div')(({ theme }) => ({
  position: 'absolute',
  right: -2,
  top: 0,
  height: '100%',
  width: '4px',
  background: 'transparent',
  cursor: 'col-resize',
  userSelect: 'none',
  touchAction: 'none',
  zIndex: 1,
  transition: 'background-color 0.2s ease',
  '&:hover': {
    background: theme.palette.primary.main,
    opacity: 0.5
  },
  '&.isResizing': {
    background: theme.palette.primary.main,
    opacity: 0.7
  }
}));

export const CellContainer = styled('div')(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  textOverflow: 'ellipsis',
  textWrap: 'unset',
  overflow: 'hidden'
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
