import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useMobileNavStore } from '@/store/mobileNavStore/mobileNav.store';
import type { MobileTab } from '@/store/mobileNavStore/types';
import type { JSX } from 'react';
import type { TabBarItem } from '../types';
import { TabBarButtonStyled, TabBarStyled } from './TabBar.styled';

const items: TabBarItem[] = [
  { id: 'explore', label: locales.mobile_tab_explore, icon: 'database' },
  { id: 'query', label: locales.mobile_tab_query, icon: 'code' },
  { id: 'ai', label: locales.mobile_tab_ai, icon: 'wand_sparkles' }
];

export default function TabBar(): JSX.Element {
  const activeTab = useMobileNavStore((state) => state.activeTab);
  const setActiveTab = useMobileNavStore((state) => state.setActiveTab);
  const resetTab = useMobileNavStore((state) => state.resetTab);

  const handleSelect = (tab: MobileTab): void => {
    // Tapping the active tab again returns to its root, as native tab bars do.
    if (tab === activeTab) {
      resetTab(tab);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <TabBarStyled aria-label={locales.mobile_navigation}>
      {items.map((item) => (
        <TabBarButtonStyled
          key={item.id}
          aria-current={item.id === activeTab ? 'page' : undefined}
          onClick={(): void => handleSelect(item.id)}
          data-testid={`mobile-tab-${item.id}`}
        >
          <CustomIcon type={item.icon} size='m' />
          {item.label}
        </TabBarButtonStyled>
      ))}
    </TabBarStyled>
  );
}
