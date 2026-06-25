'use no memo';

import SortableList from '@/components/base/SortableList/SortableList';
import PanelTabItem from '@/components/common/Panels/PanelTabs/PanelTabItem/PanelTabItem.tsx';
import { PanelTabsStyled } from '@/components/common/Panels/PanelTabs/PanelTabs.styled.ts';
import { useConnectionTabs } from '@/hooks/useConnectionTabs.hook';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { TabType } from '@/types';
import type { JSX } from 'react';
import { useCallback } from 'react';

export default function PanelTabs(): JSX.Element {
  const tabList = useConnectionTabs();
  const reorderTabs = useTabStore((state) => state.reorderTabs);

  const handleReorder = useCallback(
    (activeId: string, overId: string): void => {
      reorderTabs(activeId, overId);
    },
    [reorderTabs]
  );

  const renderTabItem = useCallback((tab: TabType): JSX.Element => {
    return <PanelTabItem tab={tab} />;
  }, []);

  const getTabId = useCallback((tab: TabType): string => tab.id, []);

  return (
    <PanelTabsStyled>
      <SortableList
        key={tabList.map((tab) => tab.id).join('|')}
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
}
