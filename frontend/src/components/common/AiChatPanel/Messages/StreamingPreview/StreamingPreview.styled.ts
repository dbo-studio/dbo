import { variables } from '@/core/theme/variables';
import { Box, keyframes, styled } from '@mui/material';

const blink = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
`;

export const StreamingPreviewStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$isCode'
})<{ $isCode?: boolean }>(({ theme, $isCode }) => ({
  alignSelf: 'flex-start',
  maxWidth: '100%',
  width: $isCode ? '100%' : undefined,
  backgroundColor: $isCode ? theme.palette.background.paper : 'transparent',
  borderRadius: variables.radius.medium,
  border: $isCode ? `1px solid ${theme.palette.divider}` : 'none',
  padding: $isCode ? 0 : `${theme.spacing(0.25)} 0`,
  color: theme.palette.text.text,
  overflow: 'hidden'
}));

export const StreamingCursorStyled = styled('span')(({ theme }) => ({
  display: 'inline-block',
  width: 2,
  height: '1em',
  marginLeft: 1,
  verticalAlign: 'text-bottom',
  backgroundColor: theme.palette.primary.main,
  animation: `${blink} 1s step-end infinite`
}));
