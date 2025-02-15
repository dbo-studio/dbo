import { styled } from '@mui/material';

export const SyntaxHighlighterStyled = styled('div')(({ theme }) => ({
  pre: {
    margin: 0,
    padding: theme.spacing(1),
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'JetBrainsMono-Bold'
  }
}));
