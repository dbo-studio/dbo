import { Box, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const RunInsightsRootStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(4),
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1.5),
  backgroundColor: theme.palette.action.hover,
  borderRadius: variables.radius.small
}));