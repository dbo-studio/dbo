import type { KeyboardEvent, JSX } from 'react';
import { SidebarSectionTabStyled, SidebarSectionTabsRootStyled } from './SidebarSectionTabs.styled';
import type { SidebarSectionTabsProps } from './types';

export default function SidebarSectionTabs<T extends string | number>({
  value,
  onChange,
  tabs,
  'aria-label': ariaLabel
}: SidebarSectionTabsProps<T>): JSX.Element {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    event.preventDefault();

    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    onChange(tabs[nextIndex].id);
  };

  return (
    <SidebarSectionTabsRootStyled role='tablist' aria-label={ariaLabel}>
      {tabs.map((tab, index) => {
        const selected = value === tab.id;

        return (
          <SidebarSectionTabStyled
            key={String(tab.id)}
            role='tab'
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            selected={selected}
            isLast={index === tabs.length - 1}
            onClick={(): void => onChange(tab.id)}
            onKeyDown={(event): void => handleKeyDown(event, index)}
          >
            {tab.label}
          </SidebarSectionTabStyled>
        );
      })}
    </SidebarSectionTabsRootStyled>
  );
}
