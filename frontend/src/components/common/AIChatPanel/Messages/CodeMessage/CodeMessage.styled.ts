import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const CodeMessageStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  borderRadius: variables.radius.medium,
  '& pre': {
    borderRadius: variables.radius.medium
  }
}));

export const CodeMessageHeaderStyled = styled(Box)<{ isDark: boolean }>(({ theme, isDark }) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: `${theme.spacing(1)} ${theme.spacing(1)}`,
  backgroundColor: isDark ? theme.palette.background.default : theme.palette.background.paper,
  color: theme.palette.text.primary,
  borderRadius: variables.radius.medium
}));
