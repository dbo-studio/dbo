import { Box, styled } from '@mui/material';

export const SqlDiffViewStyled = styled(Box)(({ theme }) => ({
  margin: 0,
  padding: theme.spacing(1, 0),
  overflowX: 'auto',
  fontFamily: theme.editorFontFamily,
  fontSize: 12,
  lineHeight: 1.6
}));

export const SqlDiffLineStyled = styled(Box)<{ kind: 'same' | 'add' | 'del' }>(({ theme, kind }) => ({
  display: 'flex',
  whiteSpace: 'pre',
  padding: theme.spacing(0, 1.5),
  backgroundColor:
    kind === 'add'
      ? `${theme.palette.success.main}26`
      : kind === 'del'
        ? `${theme.palette.error.main}26`
        : 'transparent',
  '& .diff-sign': {
    width: theme.spacing(2),
    flexShrink: 0,
    userSelect: 'none',
    color: kind === 'add' ? theme.palette.success.main : kind === 'del' ? theme.palette.error.main : 'inherit'
  }
}));
