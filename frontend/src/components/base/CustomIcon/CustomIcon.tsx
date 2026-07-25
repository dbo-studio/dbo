import { useTheme } from '@mui/material';
import type { LucideIcon } from 'lucide-react';
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

export default function CustomIcon({
  type,
  size = 's',
  width,
  height,
  onClick,
  className,
  color
}: IconProps): JSX.Element {
  const theme = useTheme();

  let w = sizes[size].width;
  let h = sizes[size].height;

  if (width) {
    w = width;
  }
  if (height) {
    h = height;
  }

  const iconName = IconTypes[type] as keyof typeof icons;
  const LucideIcon: LucideIcon | undefined = icons[iconName];
  if (!LucideIcon) {
    return <img onClick={onClick} src={`/icons/${type}.svg`} alt={type} width={w} height={h} className={className} />;
  }

  return (
    <LucideIcon
      onClick={onClick}
      className={className}
      style={{ color: color ? color : theme.palette.text.text, display: 'inline-block' }}
      strokeWidth={1.5}
      size={w}
    />
  );
}
