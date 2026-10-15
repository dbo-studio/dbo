import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const ChatContextModalItemStyled = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  borderRadius: variables.radius.medium,
  padding: '0 4px',
  border: '1px solid transparent',
  minWidth: 0,
  // Column flex parent has a fixed height; without this, overflow:hidden lets rows shrink to 0.
  flexShrink: 0,
  overflow: 'hidden',
  ':hover': {
    border: `1px solid ${theme.palette.divider}`
  }
})) as typeof Box;
