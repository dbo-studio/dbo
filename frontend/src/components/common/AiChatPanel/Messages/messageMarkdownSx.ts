import type { Theme } from '@mui/material';

export const messageMarkdownSx = (theme: Theme) => ({
  flex: 1,
  lineHeight: 1.7,
  fontSize: theme.typography.body2.fontSize,
  wordBreak: 'break-word' as const,
  unicodeBidi: 'plaintext' as const,
  textAlign: 'start' as const,
  '& p, & li, & h1, & h2, & h3, & h4': {
    unicodeBidi: 'plaintext' as const
  },
  '& p': {
    margin: '0 0 0.6em',
    '&:last-child': { marginBottom: 0 }
  },
  '& ul, & ol': {
    margin: '0.25em 0 0.7em',
    paddingInlineStart: '1.35em'
  },
  '& li': {
    marginBottom: '0.25em',
    '& > p': { margin: 0 }
  },
  '& h1, & h2, & h3, & h4': {
    margin: '1em 0 0.4em',
    fontWeight: 600,
    lineHeight: 1.35,
  },
  // Emotion SSR: avoid :first-child; first-of-type only zeros margin at block start.
  '& > :is(h1, h2, h3, h4):first-of-type': { marginTop: 0 },
  '& :is(p, ul, ol, blockquote, pre, hr) + :is(h1, h2, h3, h4)': { marginTop: '1em' },
  '& h1': { fontSize: '1.3em' },
  '& h2': { fontSize: '1.15em' },
  '& h3': { fontSize: '1.05em' },
  '& h4': { fontSize: '1em' },
  '& hr': {
    border: 'none',
    borderTop: `1px solid ${theme.palette.divider}`,
    margin: '1em 0'
  },
  '& code': {
    fontFamily: theme.typography.fontFamily,
    fontSize: '0.9em',
    backgroundColor: theme.palette.action.hover,
    padding: '0.1em 0.35em',
    borderRadius: theme.shape.borderRadius
  },
  '& pre': {
    margin: '0.5em 0',
    padding: theme.spacing(1),
    overflowX: 'auto',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.action.hover,
    '& code': {
      padding: 0,
      backgroundColor: 'transparent'
    }
  },
  '& blockquote': {
    margin: '0.5em 0',
    paddingInlineStart: theme.spacing(1),
    borderInlineStart: `3px solid ${theme.palette.divider}`,
    color: theme.palette.text.subdued
  },
  '& a': {
    color: theme.palette.text.link,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline'
    }
  }
});
