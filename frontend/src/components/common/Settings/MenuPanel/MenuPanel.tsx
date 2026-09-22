import { NavRailItem, NavRailList } from '@/components/base/NavRail/NavRail';
import type { SettingsNavGroup } from '@/core/settings/registry';
import locales from '@/locales';
import { type JSX, useEffect, useMemo } from 'react';
import type { MenuPanelProps, MenuPanelTabType } from '../types';
import { MenuPanelGroupLabelStyled } from './MenuPanel.styled';

const GROUP_ORDER: SettingsNavGroup[] = ['prefs', 'workspace'];

const GROUP_LABEL: Record<SettingsNavGroup, string> = {
  prefs: locales.settings_nav_preferences,
  workspace: locales.settings_nav_workspace
};

export default function MenuPanel({ tabs, onChange, defaultTab }: MenuPanelProps): JSX.Element {
  const selectedTabId = defaultTab?.id ?? tabs[0]?.id ?? 0;

  const selectedTab = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId);
  }, [selectedTabId, tabs]);

  useEffect(() => {
    onChange(selectedTab);
  }, [onChange, selectedTab]);

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      items: tabs.filter((tab) => (tab.group ?? 'prefs') === group)
    })).filter((section) => section.items.length > 0);
  }, [tabs]);

  function renderItem(tab: MenuPanelTabType): JSX.Element {
    return (
      <NavRailItem
        key={tab.id}
        selected={selectedTabId === tab.id}
        onClick={(): void => onChange(tab)}
        label={tab.name}
        icon={tab.icon}
      />
    );
  }

  return (
    <NavRailList>
      {grouped.map((section) => (
        <div key={section.group}>
          <MenuPanelGroupLabelStyled>{GROUP_LABEL[section.group]}</MenuPanelGroupLabelStyled>
          {section.items.map(renderItem)}
        </div>
      ))}
    </NavRailList>
  );
}
