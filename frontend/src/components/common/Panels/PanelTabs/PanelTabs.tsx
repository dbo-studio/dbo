import SortableList from '@/components/base/SortableList/SortableList';
import PanelTabItem from '@/components/common/Panels/PanelTabs/PanelTabItem/PanelTabItem.tsx';
import { PanelTabsStyled } from '@/components/common/Panels/PanelTabs/PanelTabs.styled.ts';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { TabType } from '@/types';
import type { JSX } from 'react';
import { memo, useCallback, useMemo } from 'react';

const PanelTabs: React.FC = memo((): JSX.Element => {
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);
  const tabs = useTabStore((state) => state.tabs);
  const getTabs = useTabStore((state) => state.getTabs);
  const reorderTabs = useTabStore((state) => state.reorderTabs);

  const tabList = useMemo(() => getTabs(), [currentConnectionId, tabs, getTabs]);

  const handleReorder = useCallback(
    (activeId: string, overId: string): void => {
      reorderTabs(activeId, overId);
    },
    [reorderTabs]
  );

  const renderTabItem = useCallback(
    (tab: TabType): JSX.Element => {
      return <PanelTabItem tab={tab} key={`${tab.id}-${tab.mode}`} />;
    },
    []
  );

  const getTabId = useCallback((tab: TabType): string => {
    return tab.id;
  }, []);

  return (
    <PanelTabsStyled>
      <SortableList
        items={tabList}
        onReorder={handleReorder}
        renderItem={renderTabItem}
        getItemId={getTabId}
        direction='horizontal'
        activationDistance={8}
        className='panel-tabs-sortable'
      />
    </PanelTabsStyled>
  );
});

PanelTabs.displayName = 'PanelTabs';

export default PanelTabs;
