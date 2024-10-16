import type { IconTypes } from '@/components/base/CustomIcon/types';
import { useUUID } from '@/hooks';
import { useEffect, useMemo, useState } from 'react';
import { MenuPanelStyled } from './MenuPanel.styled';
import MenuPanelItem from './MenuPanelItem/MenuPanelItem';

const tabs: {
  id: number;
  name: string;
  icon: keyof typeof IconTypes;
  content: JSX.Element;
}[] = [
  {
    id: 0,
    name: 'Tab 1',
    icon: 'settings',
    content: <div>Tab 1 content</div>
  }
];

export default function MenuPanel({ onChange }: { onChange: (el: JSX.Element | undefined) => void }) {
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
