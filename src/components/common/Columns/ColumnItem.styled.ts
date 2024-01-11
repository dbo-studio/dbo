import { variables } from '@/src/core/theme/variables';
import { Box, styled } from '@mui/material';

export const ColumnItemStyled = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'start',
  cursor: 'pointer',
  borderRadius: variables.radius.medium,
  padding: '2px',
  border: '1px solid transparent',
  ':hover': {
    border: `1px solid ${theme.palette.divider}`
  }
}));
