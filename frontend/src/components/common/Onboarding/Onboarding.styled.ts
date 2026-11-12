import { variables } from '@/core/theme/variables';
import { Box, ButtonBase, styled } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';

const rise = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const reducedMotion = '@media (prefers-reduced-motion: reduce)';

/** Fixed size, so the dialog never jumps between steps. */
export const OnboardingShellStyled = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '264px minmax(0, 1fr)',
  width: 'min(860px, calc(100vw - 32px))',
  height: 'min(560px, calc(90dvh - 32px))',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
  transition: `background-color ${variables.motion.base} ${variables.motion.easing}`,
  [theme.breakpoints.down('md')]: { gridTemplateColumns: '1fr' }
}));

export const OnboardingSideStyled = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  padding: theme.spacing(3),
  overflow: 'hidden',
  borderRight: `1px solid ${theme.palette.divider}`,
  backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.06),
  // Soft rings behind the stepper: a quiet nod to a connection radiating out.
  '&::before, &::after': {
    content: '""',
    position: 'absolute',
    left: '50%',
    bottom: -120,
    borderRadius: '50%',
    border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
    transform: 'translateX(-50%)',
    pointerEvents: 'none'
  },
  '&::before': { width: 280, height: 280 },
  '&::after': { width: 440, height: 440, bottom: -200, borderColor: alpha(theme.palette.primary.main, 0.12) },
  [theme.breakpoints.down('md')]: { display: 'none' }
}));

export const OnboardingBrandStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.25),
  fontWeight: 700,
  color: theme.palette.text.primary,
  img: { width: 28, height: 28, display: 'block' }
}));

export const StepRowStyled = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'state'
})<{ state: 'done' | 'active' | 'todo' }>(({ theme, state }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: theme.spacing(1.5),
  width: '100%',
  padding: theme.spacing(1),
  borderRadius: variables.radius.medium,
  textAlign: 'left',
  color: state === 'todo' ? theme.palette.text.secondary : theme.palette.text.primary,
  backgroundColor: state === 'active' ? alpha(theme.palette.primary.main, 0.14) : 'transparent',
  fontWeight: state === 'active' ? 600 : 400,
  transition: `background-color ${variables.motion.fast} ${variables.motion.easing}`,
  '&:hover': { backgroundColor: alpha(theme.palette.primary.main, state === 'active' ? 0.14 : 0.08) },
  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 1 }
}));

export const StepBadgeStyled = styled('span', {
  shouldForwardProp: (prop) => prop !== 'state'
})<{ state: 'done' | 'active' | 'todo' }>(({ theme, state }) => ({
  width: 24,
  height: 24,
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  borderRadius: '50%',
  fontSize: variables.fontSize.xs,
  fontWeight: 600,
  border: `1px solid ${state === 'todo' ? theme.palette.divider : theme.palette.primary.main}`,
  color: state === 'active' ? theme.palette.primary.contrastText : theme.palette.primary.main,
  backgroundColor: state === 'active' ? theme.palette.primary.main : 'transparent'
}));

export const OnboardingMainStyled = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  minHeight: 0
});

/** The step content scrolls inside a fixed frame. `key` it per step so each one fades in. */
export const OnboardingBodyStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: theme.spacing(4, 4, 2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2.5),
  animation: `${rise} ${variables.motion.base} ${variables.motion.easing} both`,
  [reducedMotion]: { animation: 'none' }
}));

export const OnboardingFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5, 4, 2.5)
}));

export const OnboardingEyebrowStyled = styled('span')(({ theme }) => ({
  fontSize: variables.fontSize.xs,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: theme.palette.primary.main
}));

export const OnboardingTitleStyled = styled('h1')(({ theme }) => ({
  margin: 0,
  fontSize: 'clamp(1.5rem, 3vw, 1.75rem)',
  lineHeight: 1.15,
  letterSpacing: '-0.02em',
  fontWeight: 700,
  color: theme.palette.text.primary
}));

export const LogoTileStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'order'
})<{ order: number }>(({ theme, order }) => ({
  aspectRatio: '1 / 1',
  display: 'grid',
  placeItems: 'center',
  borderRadius: variables.radius.large,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  animation: `${rise} 240ms ${variables.motion.easing} ${order * 50}ms both`,
  [reducedMotion]: { animation: 'none' }
}));

export const ChoiceCardStyled = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'selected'
})<{ selected: boolean }>(({ theme, selected }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: variables.radius.large,
  textAlign: 'left',
  border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  boxShadow: selected ? `0 0 0 1px ${theme.palette.primary.main}` : 'none',
  backgroundColor: selected ? alpha(theme.palette.primary.main, 0.06) : theme.palette.background.default,
  transition: `border-color ${variables.motion.fast} ${variables.motion.easing}`,
  '&:hover': { borderColor: theme.palette.primary.main },
  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
}));
