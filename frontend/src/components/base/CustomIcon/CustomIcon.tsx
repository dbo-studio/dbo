import { variables } from '@/core/theme/variables';
import { useTheme } from '@mui/material';
import type { LucideIcon } from 'lucide-react';
import { icons } from 'lucide-react';
import type { JSX } from 'react';
import { type IconProps, IconTypes } from './types';

const sizes = Object.fromEntries(
  Object.entries(variables.icon).map(([key, px]) => [key, { width: px, height: px }])
) as Record<keyof typeof variables.icon, { width: number; height: number }>;

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

  const mapped = IconTypes[type];
  const lucideName = (mapped ?? type) as keyof typeof icons;
  const LucideIcon: LucideIcon | undefined = icons[lucideName];
  if (!LucideIcon) {
    const asset = mapped ?? type;
    return <img onClick={onClick} src={`/icons/${asset}.svg`} alt={type} width={w} height={h} className={className} />;
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
