import type { Theme } from '@mui/material';

export const messageMarkdownSx = (theme: Theme) => ({
  flex: 1,
  lineHeight: 1.65,
  fontSize: theme.typography.body2.fontSize,
  wordBreak: 'break-word' as const,
  '& p': {
    margin: '0 0 0.6em',
    '&:last-child': { marginBottom: 0 }
  },
  '& ul, & ol': {
    margin: '0.25em 0 0.6em',
    paddingLeft: '1.35em'
  },
  '& li': {
    marginBottom: '0.2em'
  },
  '& h1, & h2, & h3': {
    margin: '0.6em 0 0.35em',
    fontSize: theme.typography.body2.fontSize,
    fontWeight: 600,
    lineHeight: 1.4,
    '&:first-of-type': { marginTop: 0 }
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
    paddingLeft: theme.spacing(1),
    borderLeft: `3px solid ${theme.palette.divider}`,
    color: theme.palette.text.subdued
  },
  '& a': {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline'
    }
  }
});
