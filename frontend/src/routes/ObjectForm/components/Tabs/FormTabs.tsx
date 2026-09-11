import NavRail, { NavRailItem, NavRailList } from '@/components/base/NavRail/NavRail';
import locales from '@/locales';
import type { ObjectTabType } from '@/types/Tree';
import { type JSX, type KeyboardEvent, useRef } from 'react';
import type { FormTabProps } from '../../types';

export default function FormTabs({ tabs, selectedTabId, onTabChange }: FormTabProps): JSX.Element {
  const itemRef = useRef<Record<string, HTMLDivElement | null>>({});
  const activeId = selectedTabId ?? tabs[0]?.id ?? '';

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }

    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    const nextId = tabs[nextIndex].id;
    onTabChange(nextId);
    itemRef.current[nextId]?.focus();
  }

  return (
    <NavRail role='tablist' aria-label={locales.object_form_sections}>
      <NavRailList>
        {tabs.map((tab: ObjectTabType, index) => {
          const selected = activeId === tab.id;

          return (
            <NavRailItem
              key={tab.id}
              ref={(el): void => {
                itemRef.current[tab.id] = el;
              }}
              label={tab.name}
              selected={selected}
              role='tab'
              tabIndex={selected ? 0 : -1}
              testId={`object-form-tab-${tab.id}`}
              onClick={(): void => onTabChange(tab.id)}
              onKeyDown={(event): void => handleKeyDown(event, index)}
            />
          );
        })}
      </NavRailList>
    </NavRail>
  );
}
