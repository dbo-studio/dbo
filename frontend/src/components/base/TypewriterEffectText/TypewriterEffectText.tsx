import { Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { TypewriterCursor } from './TypewriterEffectText.styled';
import type { TypewriterEffectTextProps } from './types';

export default function TypewriterEffectText({ text, speed = 30 }: TypewriterEffectTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enableTypewriter, setEnableTypewriter] = useState(false);

  useEffect(() => {
    if (!enableTypewriter) {
      setDisplayedText(text);
      setCurrentIndex(text.length);
      return;
    }

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed, enableTypewriter]);

  useEffect(() => {
    setEnableTypewriter(true);
    const estimatedDuration = 3000;
    const timer = setTimeout(() => {
      setEnableTypewriter(false);
    }, estimatedDuration);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (enableTypewriter) {
      setDisplayedText('');
      setCurrentIndex(0);
    } else {
      setDisplayedText(text);
      setCurrentIndex(text.length);
    }
  }, [text, enableTypewriter]);

  return (
    <Typography variant='body2' whiteSpace={'pre-wrap'} lineHeight={1.6}>
      {displayedText}
      {enableTypewriter && currentIndex < text.length && <TypewriterCursor>|</TypewriterCursor>}
    </Typography>
  );
}
