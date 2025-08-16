import { useTheme } from '@mui/material';
import { icons } from 'lucide-react';
import type { JSX } from 'react';
import { type IconProps, IconTypes } from './types';

const sizes = {
  l: {
    width: 30,
    height: 30
  },
  m: {
    width: 20,
    height: 20
  },
  s: {
    width: 16,
    height: 16
  },
  xs: {
    width: 11,
    height: 11
  }
};

export default function CustomIcon({ type, size = 's', width, height, onClick, className }: IconProps): JSX.Element {
  const theme = useTheme();

  let w = sizes[size].width;
  let h = sizes[size].height;

  if (width) {
    w = width;
  }
  if (height) {
    h = height;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const LucideIcon = icons[IconTypes[type]];
  if (!LucideIcon) {
    return <img onClick={onClick} src={`/icons/${type}.svg`} alt={type} width={w} height={h} className={className} />;
  }

  return (
    <LucideIcon
      onClick={onClick}
      className={className}
      style={{ color: theme.palette.text.text, display: 'inline-block' }}
      strokeWidth={1.5}
      size={w}
    />
  );
}
