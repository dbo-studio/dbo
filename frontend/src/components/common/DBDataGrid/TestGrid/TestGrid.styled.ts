import { styled } from '@mui/material';

export const TableHeader = styled('th')(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.text,
  position: 'relative',
  textAlign: 'left',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  boxSizing: 'border-box',
  border: `1px solid ${theme.palette.divider}`,
  padding: '2px 8px',
  display: 'flex'
}));

export const TableCell = styled('td')(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  height: '32px',
  boxSizing: 'border-box',
  padding: '2px 8px',
  color: theme.palette.text.subdued,
  width: '100%',

  '.selected-highlight &': {
    backgroundColor: `${theme.palette.action.selected} !important`
  },

  '.removed-highlight &': {
    backgroundColor: `${theme.palette.error.light} !important`,
    opacity: 0.7,
    textDecoration: 'line-through'
  },

  '.unsaved-highlight &': {
    backgroundColor: `${theme.palette.warning.light} !important`,
    opacity: 0.7
  },

  '.edit-highlight &': {
    backgroundColor: `${theme.palette.info.light} !important`,
    opacity: 0.7
  }
}));

export const StyledTable = styled('table')(({ theme }) => ({
  width: '100%',
  tableLayout: 'fixed',
  borderCollapse: 'separate',
  borderSpacing: 0,
  display: 'grid'
}));

export const CellContent = styled('div')(({ theme }) => ({
  width: '100%',
  height: '22px',
  maxWidth: '100%',
  cursor: 'pointer',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  display: 'block'
}));

export const CellInput = styled('input')(({ theme }) => ({
  width: '100%',
  height: '22px',
  maxWidth: '100%', // Changed from fixed 400px to 100%
  fontSize: 'inherit',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  outline: 'none',
  boxSizing: 'border-box'
}));

export const TableContainer = styled('div')(({ theme }) => ({
  width: '100%',
  overflow: 'auto',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius
}));

export const StyledTableRow = styled('tr')(({ theme }) => ({
  display: 'flex',
  width: '100%',
  '&:nth-of-type(odd)': {
    // backgroundColor: theme.palette.action.hover
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
  alignItems: 'center'
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
