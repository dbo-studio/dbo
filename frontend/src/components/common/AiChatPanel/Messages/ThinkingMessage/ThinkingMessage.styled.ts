import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

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
