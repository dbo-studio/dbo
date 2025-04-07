import PanelTabItem from '@/components/common/Panels/PanelTabs/PanelTabItem/PanelTabItem.tsx';
import { PanelTabsStyled } from '@/components/common/Panels/PanelTabs/PanelTabs.styled.ts';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { TabType } from '@/types';
import { type JSX, useMemo } from 'react';

export default function PanelTabs(): JSX.Element {
  const { currentConnectionId } = useConnectionStore();
  const { tabs, getTabs } = useTabStore();
  const tabList = useMemo(() => getTabs(), [currentConnectionId, tabs]);

  return (
    <PanelTabsStyled>
      {tabList.map((tab: TabType) => (
        <PanelTabItem tab={tab} key={`${tab.id}-${tab.mode}`} />
      ))}
    </PanelTabsStyled>
  );
}
