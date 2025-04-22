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
  maxWidth: '400px',
  height: '22px'
}));

export const TableCell = styled('td')(({ theme }) => ({
  padding: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '400px',
  height: '22px'
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

export const StyledTable = styled('table')(({ theme }) => ({
  width: '100%',
  tableLayout: 'fixed',
  borderCollapse: 'collapse'
}));

export const StyledTableRow = styled('tr')(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover
  }
}));

export const Resizer = styled('div')(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 0,
  height: '100%',
  width: '5px',
  cursor: 'col-resize',
  userSelect: 'none',
  touchAction: 'none',
  zIndex: 1,
  '&.isResizing': {
    backgroundColor: theme.palette.primary.main
  }
}));
