import type { AiProviderType } from '@/types';
import { useTheme } from '@mui/material';
import type { JSX } from 'react';

// Marks come from @lobehub/icons-static-svg (MIT) and live in /public/icons like the connection logos.
// Gemini is in colour; the others are black marks, inverted in dark mode.
const COLORED: ReadonlyArray<AiProviderType['type']> = ['gemini'];

export default function ProviderLogo({
  type,
  size = 28
}: {
  type: AiProviderType['type'];
  size?: number;
}): JSX.Element {
  const theme = useTheme();
  const invert = theme.palette.mode === 'dark' && !COLORED.includes(type);

  return (
    <img
      src={`/icons/${type}.svg`}
      alt=''
      width={size}
      height={size}
      style={{ flexShrink: 0, filter: invert ? 'invert(1)' : undefined }}
    />
  );
}
