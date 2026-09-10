import type { SettingsNavGroup } from '@/core/settings/registry';
import locales from '@/locales';
import { type JSX, useEffect, useMemo } from 'react';
import type { MenuPanelProps, MenuPanelTabType } from '../types';
import { MenuPanelGroupLabelStyled, MenuPanelStyled } from './MenuPanel.styled';
import MenuPanelItem from './MenuPanelItem/MenuPanelItem';

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
      <MenuPanelItem
        key={tab.id}
        selected={selectedTabId === tab.id}
        onClick={(): void => onChange(tab)}
        name={tab.name}
        icon={tab.icon}
      />
    );
  }

  return (
    <MenuPanelStyled>
      {grouped.map((section) => (
        <div key={section.group}>
          <MenuPanelGroupLabelStyled>{GROUP_LABEL[section.group]}</MenuPanelGroupLabelStyled>
          {section.items.map(renderItem)}
        </div>
      ))}
    </MenuPanelStyled>
  );
}
