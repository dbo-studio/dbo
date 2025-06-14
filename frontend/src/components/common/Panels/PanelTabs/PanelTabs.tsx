import PanelTabItem from '@/components/common/Panels/PanelTabs/PanelTabItem/PanelTabItem.tsx';
import { PanelTabsStyled } from '@/components/common/Panels/PanelTabs/PanelTabs.styled.ts';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { TabType } from '@/types';
import { type JSX, memo, useMemo } from 'react';

const PanelTabs = memo((): JSX.Element => {
  const { currentConnectionId } = useConnectionStore();
  const { tabs, getTabs } = useTabStore();

  const tabList = useMemo(() => getTabs(), [currentConnectionId, tabs]);

  const tabItems = useMemo(
    () => tabList.map((tab: TabType) => <PanelTabItem tab={tab} key={`${tab.id}-${tab.mode}`} />),
    [tabList]
  );

  return <PanelTabsStyled>{tabItems}</PanelTabsStyled>;
});

PanelTabs.displayName = 'PanelTabs';

export default PanelTabs;
