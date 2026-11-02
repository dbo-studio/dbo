import { alpha, Box, ButtonBase, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const StatusBarStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  height: 24,
  flexShrink: 0,
  padding: theme.spacing(0, 1),
  borderTop: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.subdued,
  fontSize: variables.fontSize.sm,
  color: theme.palette.text.secondary
}));

export const StatusItemStyled = styled(ButtonBase)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  height: 20,
  padding: theme.spacing(0, 0.75),
  borderRadius: variables.radius.small,
  fontSize: 'inherit',
  color: 'inherit',
  '&:hover': { background: theme.palette.action.hover, color: theme.palette.text.primary },
  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}` }
}));

export const StatusDotStyled = styled('span', {
  shouldForwardProp: (prop) => prop !== 'tone'
})<{ tone: 'success' | 'warning' | 'error' | 'idle' | 'busy' }>(({ theme, tone }) => {
  const color =
    tone === 'idle'
      ? theme.palette.text.disabled
      : tone === 'busy'
        ? theme.palette.primary.main
        : theme.palette[tone].main;

  return {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: color,
    boxShadow: tone === 'busy' ? `0 0 0 3px ${alpha(color, 0.25)}` : undefined
  };
});

export const StatusSpacerStyled = styled('span')({ flex: 1 });

/** Plain status text (not clickable): the connection and the active tab's info. */
export const StatusTextStyled = styled('span')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  padding: theme.spacing(0, 0.75),
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0
}));
