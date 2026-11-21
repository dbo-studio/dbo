import { variables } from '@/core/theme/variables';
import { Box, Stack, Typography, styled } from '@mui/material';

export const ThinkingMessageStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$isLive'
})<{ $isLive?: boolean }>(({ theme, $isLive }) => ({
  alignSelf: 'flex-start',
  maxWidth: '100%',
  backgroundColor: theme.palette.background.default,
  borderRadius: variables.radius.medium,
  border: `1px dashed ${$isLive ? theme.palette.primary.main : theme.palette.divider}`,
  padding: `${theme.spacing(0.75)} ${theme.spacing(1)}`,
  opacity: $isLive ? 1 : 0.92
}));

export const ThinkingMessageHeaderStyled = styled(Stack, {
  shouldForwardProp: (prop) => prop !== '$collapsed'
})<{ $collapsed?: boolean }>(({ theme, $collapsed }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  cursor: 'pointer',
  marginBottom: $collapsed ? 0 : theme.spacing(0.5)
}));

export const ThinkingMessageCaptionStyled = styled(Typography)({
  fontWeight: 500
});

export const ThinkingMessageContentStyled = styled(Typography)({
  whiteSpace: 'pre-wrap',
  fontStyle: 'italic',
  lineHeight: 1.55,
  fontSize: variables.fontSize.md,
  unicodeBidi: 'plaintext'
});
