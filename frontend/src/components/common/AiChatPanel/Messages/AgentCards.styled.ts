import { variables } from '@/core/theme/variables';
import { Box, alpha, keyframes, styled } from '@mui/material';

const appear = keyframes`
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: none; }
`;

export const AgentCardStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'accent'
})<{ accent?: string }>(({ theme, accent }) => ({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  border: `1px solid ${accent ? alpha(accent, 0.5) : theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.paper,
  animation: `${appear} 160ms ease-out`,
  overflow: 'hidden'
}));

export const AgentCardHeaderStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  minHeight: 30,
  padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
  cursor: 'pointer',
  userSelect: 'none',
  '@media (pointer: coarse)': {
    minHeight: 44
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover
  }
}));

export const AgentCardBodyStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.75),
  padding: theme.spacing(1),
  borderTop: `1px solid ${theme.palette.divider}`,
  '& pre': {
    margin: 0,
    borderRadius: variables.radius.small,
    maxHeight: 240,
    overflow: 'auto'
  }
}));

export const ToolRowStyled = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`
}));

export const RawTextStyled = styled('pre')(({ theme }) => ({
  fontFamily: 'var(--editor-font, monospace)',
  fontSize: variables.fontSize.sm,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  padding: theme.spacing(0.75),
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.secondary
}));

export const CardActionsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: theme.spacing(0.75)
}));
