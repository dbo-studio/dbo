import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Typography } from '@mui/material';
import SelectionIndicator from '@/components/base/SelectionIndicator/SelectionIndicator';
import { type KeyboardEvent, type JSX, useRef } from 'react';
import { NavRailItemStyled, NavRailListStyled, NavRailStyled } from './NavRail.styled';
import type { NavRailItemProps, NavRailProps } from './types';

export default function NavRail({
  children,
  hideOnMobile = false,
  fullWidth = false,
  role,
  'aria-label': ariaLabel
}: NavRailProps): JSX.Element {
  return (
    <NavRailStyled hideOnMobile={hideOnMobile} fullWidth={fullWidth} role={role} aria-label={ariaLabel}>
      {children}
    </NavRailStyled>
  );
}

export function NavRailList({ children }: { children: NavRailProps['children'] }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <NavRailListStyled ref={ref}>
      <SelectionIndicator rootRef={ref} variant='nav' />
      {children}
    </NavRailListStyled>
  );
}

export function NavRailItem({
  label,
  selected,
  onClick,
  icon,
  role = 'button',
  testId,
  tabIndex,
  ref,
  onKeyDown
}: NavRailItemProps): JSX.Element {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
    onKeyDown?.(event);
  }

  return (
    <NavRailItemStyled
      ref={ref}
      selected={selected}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={role}
      tabIndex={tabIndex ?? 0}
      aria-current={role === 'button' && selected ? 'page' : undefined}
      aria-selected={role === 'tab' ? selected : undefined}
      data-testid={testId}
    >
      {icon && <CustomIcon type={icon} size='s' />}
      <Typography variant='subtitle2'>{label}</Typography>
    </NavRailItemStyled>
  );
}
