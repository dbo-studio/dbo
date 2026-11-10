import { Box, styled } from '@mui/material';

export const UnlockPanelStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'compact'
})<{ compact?: boolean }>(({ theme, compact }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: compact ? 'stretch' : 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(compact ? 2 : 3, 2),
  width: compact ? 300 : '100%',
  textAlign: compact ? 'left' : 'center',
  svg: { color: theme.palette.warning.main }
}));

export const UnlockFormStyled = styled('form')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  width: '100%',
  textAlign: 'left'
}));

export const UnlockActionsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing(1)
}));
