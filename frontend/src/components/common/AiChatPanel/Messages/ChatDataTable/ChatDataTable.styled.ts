import {
  CellContent,
  StyledCol,
  StyledTable,
  StyledTableHead,
  StyledTableRow,
  TableCell,
  TableContainer,
  TableHeader
} from '@/components/common/DataGrid/DataGrid.styled';
import { variables } from '@/core/theme/variables';
import { Box, styled, Typography } from '@mui/material';

export const ChatDataTableWrapper = styled(Box)(({ theme }) => ({
  margin: `${theme.spacing(1)} 0`,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden'
}));

export const ChatDataTableScroll = styled(TableContainer)(() => ({
  maxHeight: 280,
  height: 'auto',
  // The toolbar (or footer) below draws the separating border.
  'tbody tr:last-child td': { borderBottom: 'none' }
}));

// Header and cells are the Data tab grid's own; only the read-only cell cursor differs.
export const ChatTableHeader = styled(TableHeader)(() => ({ minWidth: 96 }));

export const ChatTableCell = styled(TableCell)(() => ({ padding: 0 }));

export const ChatCellContent = styled(CellContent)(() => ({
  cursor: 'default',
  lineHeight: '22px',
  padding: '0 8px',
  boxSizing: 'border-box'
}));

export const ChatDataTableToolbar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  padding: `${theme.spacing(0.25)} ${theme.spacing(0.75)}`,
  backgroundColor: theme.palette.background.default,
  borderTop: `1px solid ${theme.palette.divider}`
}));

export const ChatDataTableFooter = styled(Typography)(({ theme }) => ({
  display: 'block',
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: `${theme.spacing(0.75)} ${theme.spacing(1.25)}`,
  color: theme.palette.text.subdued,
  backgroundColor: theme.palette.background.default,
  fontSize: theme.typography.caption.fontSize
}));

export { StyledTable, StyledTableHead, StyledTableRow, StyledCol };
