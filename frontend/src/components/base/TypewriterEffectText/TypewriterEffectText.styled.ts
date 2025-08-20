import { styled } from '@mui/material/styles';

export const TypewriterCursor = styled('span')(({ theme }) => ({
  animation: 'blink 1s infinite',
  color: theme.palette.primary.main,
  fontWeight: 'bold',
  '@keyframes blink': {
    '0%, 50%': {
      opacity: 1
    },
    '51%, 100%': {
      opacity: 0
    }
  }
}));
