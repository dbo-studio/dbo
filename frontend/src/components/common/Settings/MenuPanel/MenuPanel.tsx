import { tools } from '@/core/utils';
import { useUUID } from '@/hooks';
import { type JSX, useEffect, useMemo, useState } from 'react';
import type { MenuPanelProps } from '../types';
import { MenuPanelStyled } from './MenuPanel.styled';
import MenuPanelItem from './MenuPanelItem/MenuPanelItem';

export default function MenuPanel({ tabs, onChange }: MenuPanelProps): JSX.Element {
  const uuids = useUUID(4);
  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);
  const [isDesktop, setIsDesktop] = useState(false);

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId]);

  useEffect(() => {
    tools
      .isTauri()
      .then((e) => e ?? setIsDesktop(e))
      .catch();
    onChange(selectedTabContent);
  }, [selectedTabId]);

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
