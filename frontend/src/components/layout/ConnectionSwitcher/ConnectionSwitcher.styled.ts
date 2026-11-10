import { alpha, Box, ButtonBase, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const SwitcherTriggerStyled = styled(ButtonBase)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.25),
  width: '100%',
  // One 35px row, the same height as the tab strips beside it, so the dividers line up.
  height: 35,
  flexShrink: 0,
  padding: theme.spacing(0, 1.5),
  textAlign: 'left',
  borderBottom: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.subdued,
  '&:hover': { background: theme.palette.background.paper },
  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 }
}));

export const SwitcherTextStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'baseline',
  gap: theme.spacing(1)
}));

export const SwitcherPanelStyled = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  width: 320,
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: 420
});

export const SwitcherSearchStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`
}));

export const SwitcherListStyled = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: 4
});

export const SwitcherRowStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected'
})<{ selected?: boolean }>(({ theme, selected }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.25),
  padding: theme.spacing(0.75, 1),
  borderRadius: variables.radius.medium,
  cursor: 'pointer',
  background: selected ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
  '&:hover': { background: selected ? alpha(theme.palette.primary.main, 0.16) : theme.palette.action.hover },
  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 }
}));

export const SwitcherFooterStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0.75, 1),
  borderTop: `1px solid ${theme.palette.divider}`
}));
