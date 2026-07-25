import { tools } from '@/core/utils';
import { useUUID } from '@/hooks';
import { type JSX, useEffect, useMemo, useState } from 'react';
import type { MenuPanelProps } from '../types';
import { MenuPanelStyled } from './MenuPanel.styled';
import MenuPanelItem from './MenuPanelItem/MenuPanelItem';

export default function MenuPanel({ tabs, onChange, defaultTab }: MenuPanelProps): JSX.Element {
  const uuids = useUUID(tabs.length);
  const [selectedTabId, setSelectedTabId] = useState(defaultTab?.id ?? tabs[0].id);
  const [isDesktop, setIsDesktop] = useState(false);

  const selectedTab = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId);
  }, [selectedTabId, tabs]);

  useEffect(() => {
    tools
      .isTauri()
      .then((e) => e ?? setIsDesktop(e))
      .catch((e) => console.debug('🚀 ~ MenuPanel ~ e:', e));
  }, []);

  useEffect(() => {
    onChange(selectedTab);
  }, [onChange, selectedTab]);

  return (
    <MenuPanelStyled>
      {tabs
        .filter((t) => {
          return isDesktop || (!isDesktop && !t.onlyDesktop);
        })
        .map((tab, index) => (
          <MenuPanelItem
            selected={selectedTabId === tab.id}
            onClick={(): void => setSelectedTabId(tab.id)}
            key={uuids[index]}
            name={tab.name}
            icon={tab.icon}
          />
        ))}
    </MenuPanelStyled>
  );
}
