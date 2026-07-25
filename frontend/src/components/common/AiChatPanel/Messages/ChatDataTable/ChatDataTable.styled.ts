import {
  CellContent,
  StyledCol,
  StyledTable,
  StyledTableHead,
  StyledTableRow,
  TableContainer
} from '@/components/common/DataGrid/DataGrid.styled';
import { variables } from '@/core/theme/variables';
import { Box, styled, Typography } from '@mui/material';

export const ChatDataTableWrapper = styled(Box)(({ theme }) => ({
  margin: `${theme.spacing(1)} 0`,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.paper,
  overflow: 'hidden'
}));

export const ChatDataTableScroll = styled(TableContainer)(({ theme }) => ({
  maxHeight: 280,
  height: 'auto',
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`
}));

export const ChatTableHeader = styled('th')(({ theme }) => ({
  backgroundColor: theme.palette.background.subdued,
  color: theme.palette.text.subdued,
  fontWeight: 500,
  fontSize: theme.typography.caption.fontSize,
  letterSpacing: '0.02em',
  textTransform: 'none',
  position: 'sticky',
  top: 0,
  zIndex: 1,
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: '6px 10px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  boxSizing: 'border-box',
  minWidth: 96
}));

export const ChatTableCell = styled('td')(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  height: 28,
  boxSizing: 'border-box',
  color: theme.palette.text.text,
  fontSize: theme.typography.caption.fontSize,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  backgroundColor: theme.palette.background.paper,
  padding: 0,
  'tr.is-striped &': {
    backgroundColor: theme.palette.background.subdued
  }
}));

export const ChatCellContent = styled(CellContent)(() => ({
  cursor: 'default',
  height: 28,
  lineHeight: '28px',
  padding: '0 10px'
}));

export const ChatDataTableFooter = styled(Typography)(({ theme }) => ({
  display: 'block',
  padding: `${theme.spacing(0.75)} ${theme.spacing(1.25)}`,
  color: theme.palette.text.subdued,
  backgroundColor: theme.palette.background.default,
  fontSize: theme.typography.caption.fontSize
}));

export { StyledTable, StyledTableHead, StyledTableRow, StyledCol };
