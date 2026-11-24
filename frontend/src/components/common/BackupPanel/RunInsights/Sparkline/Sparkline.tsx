import type { JSX } from 'react';
import { SparklineSvgStyled } from './Sparkline.styled';

export default function Sparkline({ values }: { values: number[] }): JSX.Element | null {
  if (values.length < 2) return null;
  const [w, h] = [120, 28];
  const [min, max] = [Math.min(...values), Math.max(...values)];
  const points = values
    .map(
      (v, i) => `${(i / (values.length - 1)) * w},${max === min ? h / 2 : h - 2 - ((v - min) / (max - min)) * (h - 4)}`
    )
    .join(' ');
  return (
    <SparklineSvgStyled viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      <polyline points={points} fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round' />
    </SparklineSvgStyled>
  );
}
