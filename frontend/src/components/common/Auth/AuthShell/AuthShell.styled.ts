import { variables } from '@/core/theme/variables';
import { Box, Button, styled } from '@mui/material';
import { alpha } from '@mui/material/styles';

export const AuthShellRootStyled = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100vw',
  minHeight: '100vh',
  padding: theme.spacing(3),
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
  backgroundImage: [
    `radial-gradient(ellipse 80% 55% at 50% -10%, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12)}, transparent 70%)`,
    `radial-gradient(ellipse 50% 40% at 100% 100%, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06)}, transparent 60%)`,
    `radial-gradient(ellipse 40% 30% at 0% 80%, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.08 : 0.04)}, transparent 55%)`
  ].join(', ')
}));

export const AuthShellBackdropStyled = styled(Box)(({ theme }) => ({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  opacity: theme.palette.mode === 'dark' ? 0.35 : 0.45,
  backgroundImage: `linear-gradient(${alpha(theme.palette.divider, 0.35)} 1px, transparent 1px),
    linear-gradient(90deg, ${alpha(theme.palette.divider, 0.35)} 1px, transparent 1px)`,
  backgroundSize: '48px 48px',
  maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)'
}));

export const AuthShellPanelStyled = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  width: '100%',
  maxWidth: 400,
  padding: theme.spacing(4),
  borderRadius: 12,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.92 : 0.96),
  boxShadow:
    theme.palette.mode === 'dark'
      ? `0 24px 48px ${alpha('#000', 0.45)}`
      : `0 20px 40px ${alpha(theme.palette.common.black, 0.08)}, 0 1px 0 ${alpha(theme.palette.common.white, 0.6)} inset`,
  backdropFilter: 'blur(8px)'
}));

export const AuthShellBrandStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  marginBottom: theme.spacing(3),
  gap: theme.spacing(1.5)
}));

export const AuthShellLogoStyled = styled('img')({
  width: 72,
  height: 72,
  display: 'block',
  userSelect: 'none',
  pointerEvents: 'none'
});

export const AuthShellFormStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2)
})) as typeof Box;

export const AuthShellSubmitStyled = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(0.5),
  minHeight: 42,
  fontWeight: 600,
  borderRadius: variables.radius.medium,
  textTransform: 'none'
})) as typeof Button;
