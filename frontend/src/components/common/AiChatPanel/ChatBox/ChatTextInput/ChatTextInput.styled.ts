import { styled } from '@mui/material';

export const ChatTextInputStyled = styled('div')<{ placeholder?: string }>(({ theme }) => ({
  fontSize: theme.typography.body2.fontSize,
  lineHeight: 1.5,
  backgroundColor: 'transparent',
  fontFamily: theme.typography.fontFamily,
  width: '100%',
  border: 'none',
  outline: 'none',
  maxHeight: '160px',
  minHeight: 48,
  overflowY: 'auto',
  color: theme.palette.text.text,
  padding: 0,
  position: 'relative',
  unicodeBidi: 'plaintext',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  '&[data-empty="true"]::before': {
    content: 'attr(placeholder)',
    position: 'absolute',
    inset: 0,
    color: theme.palette.text.placeholder,
    pointerEvents: 'none',
    userSelect: 'none',
    unicodeBidi: 'isolate'
  },
  '& [data-testid="ai-context-chip"]': {
    display: 'inline-flex',
    alignItems: 'center',
    verticalAlign: 'middle',
    flexShrink: 0,
    gap: theme.spacing(0.25),
    height: 22,
    maxWidth: 180,
    marginInline: 2,
    padding: theme.spacing(0, 0.25, 0, 0.75),
    borderRadius: 999,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.text,
    userSelect: 'none',
    cursor: 'default'
  },
  '& [data-chip-label]': {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: '22px'
  },
  '& [data-testid="ai-context-chip-remove"]': {
    width: 16,
    height: 16,
    flexShrink: 0,
    border: 'none',
    padding: 0,
    borderRadius: '50%',
    background: 'transparent',
    color: theme.palette.text.secondary,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: 1,
    cursor: 'pointer'
  }
}));
