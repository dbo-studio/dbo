import { alpha, Box, InputBase, styled } from '@mui/material';
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
  borderRadius: variables.radius.medium,
  boxShadow: theme.shadows[8],
  overflow: 'hidden',
  ':focus-visible': { outline: 'unset' }
}));

export const PaletteInputStyled = styled(InputBase)(({ theme }) => ({
  padding: theme.spacing(1.25, 1.5),
  fontSize: variables.fontSize.xl,
  borderBottom: `1px solid ${theme.palette.divider}`
}));

export const PaletteListStyled = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: 4
});

export const PaletteGroupStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 1, 0.25),
  color: theme.palette.text.secondary
}));

export const PaletteItemStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active'
})<{ active: boolean }>(({ theme, active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.25),
  padding: theme.spacing(0.75, 1),
  borderRadius: variables.radius.small,
  cursor: 'pointer',
  background: active ? alpha(theme.palette.primary.main, 0.14) : 'transparent',
  color: active ? theme.palette.text.link : theme.palette.text.primary,
  svg: { color: 'inherit', flexShrink: 0 }
}));
