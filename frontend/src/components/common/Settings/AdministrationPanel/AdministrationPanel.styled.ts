import { variables } from '@/core/theme/variables';
import { Box, TableContainer, styled } from '@mui/material';

export const AdministrationFormStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3)
})) as typeof Box;

export const AdministrationFormFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: theme.spacing(1)
}));

export const AdministrationUserTableContainerStyled = styled(TableContainer)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  overflow: 'auto',
  '& .MuiTableCell-root': {
    padding: theme.spacing(1, 1.5),
    minWidth: 'unset',
    verticalAlign: 'middle'
  },
  '& .MuiTableHead-root .MuiTableCell-root': {
    color: theme.palette.text.secondary,
    fontWeight: 600,
    fontSize: theme.typography.caption.fontSize,
    whiteSpace: 'nowrap'
  }
}));
