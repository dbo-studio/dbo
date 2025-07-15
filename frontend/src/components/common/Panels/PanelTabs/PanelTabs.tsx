import PanelTabItem from '@/components/common/Panels/PanelTabs/PanelTabItem/PanelTabItem.tsx';
import { PanelTabsStyled } from '@/components/common/Panels/PanelTabs/PanelTabs.styled.ts';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { TabType } from '@/types';
import type { JSX } from 'react';
import { memo, useMemo } from 'react';

const PanelTabs: React.FC = memo((): JSX.Element => {
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);
  const tabs = useTabStore((state) => state.tabs);
  const getTabs = useTabStore((state) => state.getTabs);

  const tabList = useMemo(() => getTabs(), [currentConnectionId, tabs]);

  const tabItems = useMemo(
    () => tabList.map((tab: TabType) => <PanelTabItem tab={tab} key={`${tab.id}-${tab.mode}`} />),
    [tabList]
  );

  return <PanelTabsStyled>{tabItems}</PanelTabsStyled>;
});

PanelTabs.displayName = 'PanelTabs';

export default PanelTabs;
