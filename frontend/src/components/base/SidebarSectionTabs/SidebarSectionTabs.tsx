import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import type { KeyboardEvent, JSX } from 'react';
import {
  SidebarSectionTabCloseStyled,
  SidebarSectionTabLabelStyled,
  SidebarSectionTabStyled,
  SidebarSectionTabsRootStyled
} from './SidebarSectionTabs.styled';
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
            title={tab.label}
            onClick={(): void => onChange(tab.id)}
            onKeyDown={(event: KeyboardEvent<HTMLDivElement>): void => handleKeyDown(event, index)}
            {...Object.fromEntries(Object.entries(tab.data ?? {}).map(([key, value]) => [`data-${key}`, value]))}
          >
            {tab.icon && <CustomIcon type={tab.icon} size='xs' />}
            <SidebarSectionTabLabelStyled>{tab.label}</SidebarSectionTabLabelStyled>
            {tab.onClose && (
              <SidebarSectionTabCloseStyled
                role='button'
                aria-label={locales.close}
                data-testid='sidebar-tab-close'
                onClick={(event): void => {
                  event.stopPropagation();
                  tab.onClose?.();
                }}
              >
                <CustomIcon type='close' size='xs' />
              </SidebarSectionTabCloseStyled>
            )}
          </SidebarSectionTabStyled>
        );
      })}
    </SidebarSectionTabsRootStyled>
  );
}
