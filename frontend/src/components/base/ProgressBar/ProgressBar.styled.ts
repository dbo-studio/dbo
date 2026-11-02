import { alpha, Box, keyframes, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';
import type { ProgressBarStatus } from './types';

const slide = keyframes`
  from { background-position: 0 0; }
  to { background-position: 28px 0; }
`;

const sweep = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(350%); }
`;

export const ProgressBarRootStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  width: '100%'
}));

export const ProgressBarTrackStyled = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: 8,
  overflow: 'hidden',
  borderRadius: variables.radius.small,
  background: theme.palette.action.hover
}));

const fillColor = (
  theme: { palette: { primary: { main: string }; success: { main: string }; error: { main: string } } },
  status: ProgressBarStatus
): string =>
  status === 'success'
    ? theme.palette.success.main
    : status === 'error'
      ? theme.palette.error.main
      : theme.palette.primary.main;

export const ProgressBarFillStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status' && prop !== 'indeterminate'
})<{ status: ProgressBarStatus; indeterminate: boolean }>(({ theme, status, indeterminate }) => {
  const color = fillColor(theme, status);
  const stripes = `linear-gradient(135deg, ${alpha(theme.palette.common.white, 0.22)} 25%, transparent 25%, transparent 50%, ${alpha(theme.palette.common.white, 0.22)} 50%, ${alpha(theme.palette.common.white, 0.22)} 75%, transparent 75%)`;
  return {
    height: '100%',
    borderRadius: variables.radius.small,
    backgroundColor: color,
    transition: `width ${variables.motion.base} ${variables.motion.easing}`,
    ...(indeterminate ? { width: '30%', animation: `${sweep} 1.2s ${variables.motion.easing} infinite` } : {}),
    ...(status === 'active'
      ? {
          backgroundImage: stripes,
          backgroundSize: '28px 28px',
          animation: indeterminate
            ? `${sweep} 1.2s ${variables.motion.easing} infinite, ${slide} 0.9s linear infinite`
            : `${slide} 0.9s linear infinite`
        }
      : {}),
    '@media (prefers-reduced-motion: reduce)': { animation: 'none', transition: 'none' }
  };
});

export const ProgressBarCaptionStyled = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8
});
