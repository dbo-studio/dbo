import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const ChatContextItemStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  borderRadius: variables.radius.medium,
  padding: '0 4px',
  border: '1px solid transparent',
  ':hover': {
    border: `1px solid ${theme.palette.divider}`
  }
})) as typeof Box;
