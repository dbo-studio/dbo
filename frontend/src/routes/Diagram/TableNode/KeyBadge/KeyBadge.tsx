import type { JSX } from 'react';
import { KeyBadgeStyled } from '../TableNode.styled';

type KeyBadgeProps = { label: string; color: string };

export default function KeyBadge({ label, color }: KeyBadgeProps): JSX.Element {
  return <KeyBadgeStyled badgeColor={color}>{label}</KeyBadgeStyled>;
}
