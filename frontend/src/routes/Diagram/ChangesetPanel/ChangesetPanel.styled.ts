import { variables } from '@/core/theme/variables';
import { Box, alpha, styled } from '@mui/material';

export const ChangesetPanelStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  maxWidth: 560,
  padding: `${theme.spacing(1)} ${theme.spacing(1.5)}`,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.success.main, 0.5)}`,
  borderRadius: variables.radius.medium,
  boxShadow: theme.shadows[3]
}));
