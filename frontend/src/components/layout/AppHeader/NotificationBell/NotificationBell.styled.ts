import { alpha, Box, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const NotificationPanelStyled = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  width: 380,
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: 480
});

export const NotificationHeaderStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  flexShrink: 0
}));

export const NotificationListStyled = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflow: 'auto'
});

export const NotificationItemStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'unread'
})<{ unread: boolean }>(({ theme, unread }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(1.25),
  padding: theme.spacing(1.25, 1.5),
  cursor: 'pointer',
  background: unread ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
  '& + &': { borderTop: `1px solid ${theme.palette.divider}` },
  '&:hover': { background: theme.palette.action.hover },
  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
  // The delete control only shows when the row is hovered or focused.
  '& .notification-delete': { opacity: 0, transition: `opacity ${variables.motion.fast}` },
  '&:hover .notification-delete, &:focus-within .notification-delete': { opacity: 1 }
}));

export const NotificationIconStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'tone'
})<{ tone: 'success' | 'error' }>(({ theme, tone }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  flexShrink: 0,
  borderRadius: variables.radius.medium,
  color: theme.palette[tone].main,
  background: alpha(theme.palette[tone].main, 0.12)
}));

export const NotificationBodyStyled = styled(Box)({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2
});

export const NotificationClampStyled = styled('span')({
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'break-word'
});
