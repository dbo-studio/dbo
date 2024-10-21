import { useUUID } from '@/hooks';
import { useEffect, useMemo, useState } from 'react';
import { MenuPanelStyled } from './MenuPanel.styled';
import MenuPanelItem from './MenuPanelItem/MenuPanelItem';
import type { MenuPanelProps } from '../types';

export default function MenuPanel({ tabs, onChange }: MenuPanelProps) {
  const uuids = useUUID(4);
  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId]);

  useEffect(() => {
    onChange(selectedTabContent);
  }, [selectedTabId]);

  return (
    <MenuPanelStyled>
      {tabs.map((tab, index) => (
        <MenuPanelItem
          selected={selectedTabId === tab.id}
          onClick={() => setSelectedTabId(tab.id)}
          key={uuids[index]}
          name={tab.name}
          icon={tab.icon}
        />
      ))}
    </MenuPanelStyled>
  );
}
