import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const TotpSetupPanelStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  width: '100%',
  maxWidth: 360,
  padding: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.default,
  alignSelf: 'flex-start'
}));

export const TotpSetupModalBodyStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  width: '100%'
}));

export const TotpSetupModalScanStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: theme.spacing(1.5)
}));

export const TotpSetupScanRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2)
}));

export const TotpSetupSecretRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  padding: theme.spacing(0.75, 1),
  borderRadius: variables.radius.medium,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  minWidth: 0
}));

export const TotpSetupOrDividerStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  color: theme.palette.text.secondary,
  '&::before, &::after': {
    content: '""',
    flex: 1,
    height: 1,
    backgroundColor: theme.palette.divider
  }
}));

export const TotpSetupActionsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  justifyContent: 'flex-end',
  paddingTop: theme.spacing(0.5)
}));
