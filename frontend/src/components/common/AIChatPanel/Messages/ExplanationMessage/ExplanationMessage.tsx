import TypewriterEffectText from '@/components/base/TypewriterEffectText/TypewriterEffectText';
import { Typography } from '@mui/material';
import type { ExplanationMessageProps } from '../../types';
import { ExplanationMessageStyled } from './ExplanationMessage.styled';

export default function ExplanationMessage({ message }: ExplanationMessageProps) {
  return (
    <ExplanationMessageStyled user={message.role === 'user' ? 'true' : 'false'}>
      {message.role === 'assistant' && message.isNew ? (
        <TypewriterEffectText text={message.content} speed={30} />
      ) : (
        <Typography variant={'body2'} whiteSpace={'pre-wrap'} lineHeight={1.6}>
          {message.content}
        </Typography>
      )}
    </ExplanationMessageStyled>
  );
}
