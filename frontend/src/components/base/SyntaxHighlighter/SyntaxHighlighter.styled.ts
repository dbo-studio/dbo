import { styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const SyntaxHighlighterStyled = styled('div')(({ theme }) => ({
  pre: {
    margin: 0,
    padding: theme.spacing(1),
    fontSize: variables.fontSize.md,
    fontWeight: 'bold',
    fontFamily: theme.editorFontFamily,
    whiteSpace: 'pre-wrap !important',
    '& *': {
      userSelect: 'text',
      WebkitUserSelect: 'text',
      msUserSelect: 'text'
    }
  }
}));
