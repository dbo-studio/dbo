import { Box, InputBase, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const PaletteBoxStyled = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '12vh',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'min(560px, calc(100vw - 32px))',
  maxHeight: '60vh',
  display: 'flex',
  flexDirection: 'column',
  background: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.large,
  boxShadow: theme.shadows[24],
  overflow: 'hidden',
  ':focus-visible': { outline: 'unset' }
}));

export const PaletteSearchStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0, 1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.secondary
}));

// The theme boxes every InputBase (border, 24px height, padding); the palette field is bare, the bar owns the border.
export const PaletteInputStyled = styled(InputBase)(({ theme }) => ({
  '&&': {
    flex: 1,
    height: 'auto',
    padding: 0,
    border: 0,
    background: 'transparent',
    fontSize: variables.fontSize.lg
  },
  '& input': { padding: theme.spacing(1.25, 0), outline: 'none', boxShadow: 'none' }
}));

export const PaletteFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: theme.spacing(1.5),
  padding: theme.spacing(0.75, 1.5),
  borderTop: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.secondary,
  fontSize: variables.fontSize.xs,
  '& > span': { display: 'inline-flex', alignItems: 'center', gap: theme.spacing(0.75) },
  // Compact pill keys, smaller than the shortcut-panel Kbd.
  '& kbd': {
    padding: theme.spacing(0.125, 0.75),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 999,
    fontFamily: 'inherit',
    fontSize: variables.fontSize.xs,
    color: theme.palette.text.primary
  }
}));

export const PaletteListStyled = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: 6
});

export const PaletteGroupStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 1, 0.25),
  fontSize: variables.fontSize.xs,
  color: theme.palette.text.subdued
}));

export const PaletteItemStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active'
})<{ active: boolean }>(({ theme, active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1),
  fontSize: variables.fontSize.md,
  borderRadius: variables.radius.medium,
  cursor: 'pointer',
  background: active ? theme.palette.action.selected : 'transparent',
  color: theme.palette.text.primary,
  svg: { color: 'inherit', flexShrink: 0 }
}));
