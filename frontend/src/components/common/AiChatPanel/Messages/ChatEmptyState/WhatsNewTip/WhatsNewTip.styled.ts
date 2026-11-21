import { variables } from '@/core/theme/variables';
import { Alert, styled } from '@mui/material';

export const WhatsNewAlertStyled = styled(Alert)(({ theme }) => ({
  width: '100%',
  paddingTop: 0,
  paddingBottom: 0,
  fontSize: variables.fontSize.sm,
  '& .MuiAlertTitle-root': {
    fontSize: variables.fontSize.sm,
    marginBottom: theme.spacing(0.25)
  }
}));
