import { styled } from '@mui/material';

export const TableHeader = styled('th')(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  padding: theme.spacing(1),
  position: 'relative',
  textAlign: 'left',
  fontWeight: 600,
  userSelect: 'none',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  height: '22px',
  boxSizing: 'border-box',
  border: `1px solid ${theme.palette.divider}`
}));

export const TableCell = styled('td')(({ theme }) => ({
  padding: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  height: '22px',
  boxSizing: 'border-box',

  'tr.selected &': {
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
  position: 'relative'
}));

export const CellContent = styled('div')(({ theme }) => ({
  width: '100%',
  height: '22px',
  maxWidth: '400px',
  cursor: 'pointer',
  padding: theme.spacing(0.5),
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis'
}));

export const CellInput = styled('input')(({ theme }) => ({
  width: '100%',
  height: '22px',
  maxWidth: '400px',
  padding: theme.spacing(0.5),
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

// Remove this duplicate declaration
// export const StyledTable = styled('table')(({ theme }) => ({
//   width: '100%',
//   tableLayout: 'fixed',
//   borderCollapse: 'separate',
//   borderSpacing: 0
// }));

export const StyledTableRow = styled('tr')(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover
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
