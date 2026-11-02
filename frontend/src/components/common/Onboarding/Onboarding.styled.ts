import { variables } from '@/core/theme/variables';
import { Box, ButtonBase, styled } from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';

const rise = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

const drift = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
`;

const reducedMotion = '@media (prefers-reduced-motion: reduce)';

export const OnboardingRootStyled = styled(Box)(({ theme }) => ({
  position: 'fixed',
  inset: 0,
  zIndex: theme.zIndex.modal,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
  backgroundImage: [
    `radial-gradient(ellipse 60% 55% at 88% 8%, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.14)}, transparent 65%)`,
    `radial-gradient(ellipse 50% 50% at 0% 100%, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08)}, transparent 60%)`
  ].join(', '),
  transition: 'background-color 240ms ease'
}));

export const OnboardingTopStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(4),
  padding: theme.spacing(3, 6),
  [theme.breakpoints.down('md')]: { padding: theme.spacing(2, 2.5), gap: theme.spacing(2) }
}));

export const OnboardingBrandStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.25),
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: theme.palette.text.primary,
  img: { width: 28, height: 28, display: 'block' },
  [theme.breakpoints.down('md')]: { span: { display: 'none' } }
}));

export const OnboardingProgressStyled = styled(Box)({
  display: 'flex',
  flex: 1,
  gap: 6,
  maxWidth: 420,
  margin: '0 auto'
});

export const OnboardingSegmentStyled = styled('span', {
  shouldForwardProp: (prop) => prop !== 'state'
})<{ state: 'done' | 'active' | 'todo' }>(({ theme, state }) => ({
  flex: 1,
  height: 4,
  borderRadius: 2,
  backgroundColor: state === 'todo' ? alpha(theme.palette.text.primary, 0.14) : theme.palette.primary.main,
  opacity: state === 'done' ? 0.45 : 1,
  transition: 'background-color 240ms ease, opacity 240ms ease'
}));

export const OnboardingStageStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 6fr)',
  alignItems: 'center',
  gap: theme.spacing(8),
  width: '100%',
  maxWidth: 1400,
  margin: '0 auto',
  padding: theme.spacing(1, 6),
  [theme.breakpoints.down('lg')]: { gap: theme.spacing(5) },
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
    alignContent: 'start',
    gap: theme.spacing(3),
    padding: theme.spacing(1, 2.5, 2),
    overflowY: 'auto'
  }
}));

export const OnboardingCopyStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2.5),
  animation: `${rise} 420ms ${variables.motion.easing} both`,
  [reducedMotion]: { animation: 'none' },
  [theme.breakpoints.down('md')]: { order: 2 }
}));

export const OnboardingCounterStyled = styled('span')(({ theme }) => ({
  fontFamily: theme.editorFontFamily,
  fontSize: variables.fontSize.lg,
  color: theme.palette.text.secondary,
  letterSpacing: '0.08em'
}));

export const OnboardingEyebrowStyled = styled('span')(({ theme }) => ({
  fontSize: variables.fontSize.md,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: theme.palette.primary.main
}));

export const OnboardingTitleStyled = styled('h1')(({ theme }) => ({
  margin: 0,
  fontSize: 'clamp(2.25rem, 4.6vw, 4rem)',
  lineHeight: 1.05,
  letterSpacing: '-0.04em',
  fontWeight: 700,
  color: theme.palette.text.primary
}));

export const OnboardingBodyStyled = styled('p')(({ theme }) => ({
  margin: 0,
  maxWidth: 500,
  fontSize: variables.fontSize.xxl,
  lineHeight: 1.65,
  color: theme.palette.text.secondary
}));

export const OnboardingPanelStyled = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'safe center',
  justifyContent: 'center',
  minHeight: 'clamp(380px, calc(100vh - 250px), 660px)',
  // Tall steps scroll inside the card, so the stage never clips the card's shadow.
  maxHeight: 'calc(100vh - 230px)',
  padding: theme.spacing(5),
  borderRadius: 28,
  overflowY: 'auto',
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  backgroundImage: `radial-gradient(${alpha(theme.palette.text.primary, 0.1)} 1px, transparent 1px)`,
  backgroundSize: '24px 24px',
  boxShadow: `0 40px 90px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.5 : 0.1)}`,
  animation: `${rise} 520ms ${variables.motion.easing} 60ms both`,
  [reducedMotion]: { animation: 'none' },
  [theme.breakpoints.down('md')]: {
    order: 1,
    minHeight: 260,
    maxHeight: 'none',
    padding: theme.spacing(2.5),
    borderRadius: 20
  }
}));

export const OnboardingFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  padding: theme.spacing(3, 6),
  [theme.breakpoints.down('md')]: { padding: theme.spacing(2, 2.5) }
}));

export const OnboardingButtonStyled = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'tone'
})<{ tone?: 'primary' | 'ghost' }>(({ theme, tone = 'ghost' }) => ({
  height: 48,
  padding: theme.spacing(0, 3.5),
  borderRadius: 999,
  fontFamily: 'inherit',
  fontSize: variables.fontSize.lg,
  fontWeight: 600,
  transition: `transform ${variables.motion.base} ${variables.motion.easing}, background-color 160ms ease`,
  ...(tone === 'primary'
    ? {
        color: theme.palette.primary.contrastText,
        backgroundColor: theme.palette.primary.main,
        boxShadow: `0 10px 28px ${alpha(theme.palette.primary.main, 0.38)}`,
        '&:hover': { backgroundColor: theme.palette.primary.dark, transform: 'translateY(-1px)' }
      }
    : {
        color: theme.palette.text.secondary,
        '&:hover': { color: theme.palette.text.primary, backgroundColor: alpha(theme.palette.text.primary, 0.06) }
      }),
  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 3 }
}));

export const MockWindowStyled = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 640,
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  boxShadow: `0 30px 70px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.5 : 0.14)}`,
  overflow: 'hidden',
  animation: `${drift} 8s ease-in-out infinite`,
  [reducedMotion]: { animation: 'none' }
}));

export const MockBarStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: 6,
  padding: theme.spacing(1.5, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  '& > span': { width: 10, height: 10, borderRadius: '50%', backgroundColor: alpha(theme.palette.text.primary, 0.18) }
}));

export const MockLineStyled = styled('span', {
  shouldForwardProp: (prop) => prop !== 'w' && prop !== 'accent'
})<{ w: number; accent?: boolean }>(({ theme, w, accent }) => ({
  display: 'block',
  height: 9,
  width: `${w}%`,
  borderRadius: 5,
  backgroundColor: accent ? alpha(theme.palette.primary.main, 0.7) : alpha(theme.palette.text.primary, 0.14)
}));

export const MockChipStyled = styled('span', {
  shouldForwardProp: (prop) => prop !== 'dot'
})<{ dot: 'info' | 'warning' | 'success' }>(({ theme, dot }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: theme.spacing(0.75, 1.5),
  borderRadius: 999,
  fontSize: variables.fontSize.lg,
  fontWeight: 600,
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  '&::before': { content: '""', width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.palette[dot].main }
}));

export const LogoTileStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  aspectRatio: '1 / 1',
  padding: theme.spacing(1),
  borderRadius: 18,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  boxShadow: `0 12px 30px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.35 : 0.07)}`,
  animation: `${drift} 6s ease-in-out infinite`,
  img: { width: 40, height: 40, objectFit: 'contain' },
  span: {
    fontSize: variables.fontSize.xs,
    color: theme.palette.text.secondary,
    textAlign: 'center',
    lineHeight: 1.2
  },
  [reducedMotion]: { animation: 'none' }
}));

export const ChoiceCardStyled = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'selected'
})<{ selected: boolean }>(({ theme, selected }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5),
  borderRadius: 14,
  textAlign: 'left',
  border: `1.5px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: selected ? alpha(theme.palette.primary.main, 0.08) : theme.palette.background.paper,
  transition: `border-color ${variables.motion.base} ${variables.motion.easing}, transform ${variables.motion.base} ${variables.motion.easing}`,
  '&:hover': { borderColor: theme.palette.primary.main, transform: 'translateY(-1px)' },
  '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.3)}` }
}));
