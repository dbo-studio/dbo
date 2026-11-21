import type { JSX, ReactNode } from 'react';
import { TileBodyStyled, TileButtonStyled, TileIconStyled, TileSubStyled, TileTitleStyled } from './Tile.styled';

export default function Tile({
  selected,
  onClick,
  icon,
  title,
  sub,
  warn,
  testId
}: {
  selected?: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  sub?: string;
  warn?: boolean;
  testId?: string;
}): JSX.Element {
  return (
    <TileButtonStyled onClick={onClick} data-testid={testId} aria-pressed={selected} selected={selected}>
      <TileIconStyled selected={selected}>{icon}</TileIconStyled>
      <TileBodyStyled>
        <TileTitleStyled variant='body2' noWrap color='textTitle'>
          {title}
        </TileTitleStyled>
        {sub && (
          <TileSubStyled variant='caption' noWrap component='p' warn={warn}>
            {sub}
          </TileSubStyled>
        )}
      </TileBodyStyled>
    </TileButtonStyled>
  );
}