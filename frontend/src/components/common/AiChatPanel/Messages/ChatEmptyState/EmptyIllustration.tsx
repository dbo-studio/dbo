import { useTheme } from '@mui/material';
import type { JSX } from 'react';

type EmptyIllustrationProps = {
  variant: 'provider' | 'connection';
};

/** Small theme-aware line illustration for the chat empty states. */
export default function EmptyIllustration({ variant }: EmptyIllustrationProps): JSX.Element {
  const { palette } = useTheme();
  const stroke = palette.text.secondary;
  const accent = palette.primary.main;
  const fill = palette.action.hover;

  return (
    <svg width='96' height='72' viewBox='0 0 96 72' fill='none' aria-hidden='true'>
      {variant === 'connection' ? (
        <>
          <ellipse cx='36' cy='18' rx='18' ry='6' fill={fill} stroke={stroke} strokeWidth='1.5' />
          <path d='M18 18v32c0 3.3 8 6 18 6s18-2.7 18-6V18' stroke={stroke} strokeWidth='1.5' />
          <path d='M18 34c0 3.3 8 6 18 6s18-2.7 18-6' stroke={stroke} strokeWidth='1.5' />
          <path d='M62 36h8m6 0h8' stroke={accent} strokeWidth='2' strokeLinecap='round' strokeDasharray='2 4' />
          <circle cx='84' cy='36' r='4' stroke={accent} strokeWidth='1.5' />
        </>
      ) : (
        <>
          <rect x='12' y='12' width='56' height='38' rx='8' fill={fill} stroke={stroke} strokeWidth='1.5' />
          <path d='M26 50l-6 10 14-10' stroke={stroke} strokeWidth='1.5' strokeLinejoin='round' />
          <path d='M26 27h28M26 35h18' stroke={stroke} strokeWidth='1.5' strokeLinecap='round' />
          <circle cx='76' cy='48' r='10' stroke={accent} strokeWidth='1.5' />
          <path d='M76 43v10M71 48h10' stroke={accent} strokeWidth='1.5' strokeLinecap='round' />
        </>
      )}
    </svg>
  );
}
