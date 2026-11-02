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

/** The caret at the end of the last block of formatted text that is still being typed. */
export const inlineCaretSx = (color: string) => ({
  '& > p:last-child::after, & > h1:last-child::after, & > h2:last-child::after, & > h3:last-child::after, & > h4:last-child::after, & > ul:last-child > li:last-child::after, & > ol:last-child > li:last-child::after':
    {
      content: '""',
      display: 'inline-block',
      width: 2,
      height: '1em',
      marginLeft: '1px',
      verticalAlign: 'text-bottom',
      backgroundColor: color,
      animation: `${blink} 1s step-end infinite`
    }
});

export const StreamingCursorStyled = styled('span')(({ theme }) => ({
  display: 'inline-block',
  width: 2,
  height: '1em',
  marginLeft: 1,
  verticalAlign: 'text-bottom',
  backgroundColor: theme.palette.primary.main,
  animation: `${blink} 1s step-end infinite`
}));
