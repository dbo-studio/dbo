import { Box, ButtonBase, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const ActivityBarStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  width: 48,
  minWidth: 48,
  height: '100%',
  padding: theme.spacing(1, 0),
  background: theme.palette.background.subdued,
  borderRight: `1px solid ${theme.palette.divider}`
}));

export const ActivityItemStyled = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'selected'
})<{ selected?: boolean }>(({ theme, selected }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: variables.radius.medium,
  color: selected ? theme.palette.text.link : theme.palette.text.secondary,
  background: selected ? theme.palette.action.selected : 'transparent',
  '&:hover': { background: theme.palette.action.hover, color: theme.palette.text.primary },
  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}` },
  // The active area is marked at the bar's edge, where the eye already is.
  '&::before': {
    content: '""',
    position: 'absolute',
    left: -4,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    background: selected ? theme.palette.primary.main : 'transparent'
  },
  svg: { color: 'inherit' }
}));
