import { Box, Button, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const ProvidersStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  flex: 1,
  minWidth: 0
}));

export const ModelButtonStyled = styled(Button)(({ theme }) => ({
  minWidth: 0,
  maxWidth: '100%',
  height: 24,
  padding: theme.spacing(0, 0.75),
  textTransform: 'none',
  fontWeight: 400,
  fontSize: variables.fontSize.sm,
  color: theme.palette.text.secondary,
  gap: theme.spacing(0.5),
  '& .model-label': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }
}));

export const CapabilityIconStyled = styled('span', {
  shouldForwardProp: (prop) => prop !== 'warn'
})<{ warn: boolean }>(({ theme, warn }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  flexShrink: 0,
  borderRadius: '50%',
  '& svg': { color: `${warn ? theme.palette.warning.main : theme.palette.success.main} !important` }
}));

export const VisuallyHidden = styled('span')({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap'
});
