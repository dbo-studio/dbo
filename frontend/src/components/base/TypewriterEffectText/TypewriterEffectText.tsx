import { Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { TypewriterCursor } from './TypewriterEffectText.styled';
import type { TypewriterEffectTextProps } from './types';

export default function TypewriterEffectText({ text, speed = 30 }: TypewriterEffectTextProps) {
  const [typingEnabled, setTypingEnabled] = useState(true);
  const [typedLength, setTypedLength] = useState(0);
  const [prevText, setPrevText] = useState(text);

  if (text !== prevText) {
    setPrevText(text);
    if (typingEnabled) {
      setTypedLength(0);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setTypingEnabled(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!typingEnabled || typedLength >= text.length) {
      return;
    }

    const timer = setTimeout(() => {
      setTypedLength((current) => current + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [text, speed, typedLength, typingEnabled]);

  const displayedText = typingEnabled ? text.slice(0, typedLength) : text;
  const showCursor = typingEnabled && typedLength < text.length;

  return (
    <Typography
      variant='body2'
      sx={{
        whiteSpace: 'pre-wrap',
        lineHeight: 1.6
      }}
    >
      {displayedText}
      {showCursor && <TypewriterCursor>|</TypewriterCursor>}
    </Typography>
  );
}
