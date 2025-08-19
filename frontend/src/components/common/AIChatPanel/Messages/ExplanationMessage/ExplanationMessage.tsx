import { Typography } from '@mui/material';
import type { ExplanationMessageProps } from '../../types';
import { ExplanationMessageStyled } from './ExplanationMessage.styled';

export default function ExplanationMessage({ message }: ExplanationMessageProps) {
  return (
    <ExplanationMessageStyled isUser={message.role === 'user'}>
      <Typography variant='body2' whiteSpace={'pre-wrap'} lineHeight={1.6}>
        {message.content}
      </Typography>
    </ExplanationMessageStyled>
  );
}
