'use no memo';

import SortableList from '@/components/base/SortableList/SortableList';
import PanelTabItem from '@/components/common/Panels/PanelTabs/PanelTabItem/PanelTabItem.tsx';
import { PanelTabsStyled } from '@/components/common/Panels/PanelTabs/PanelTabs.styled.ts';
import { usePane } from '@/hooks/usePane';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { selectPaneTabs, selectTabs, useTabStore } from '@/store/tabStore/tab.store.ts';
import { isSplitActive, type PaneId } from '@/store/tabStore/tabs';
import type { TabType } from '@/types';
import type { DragEndEvent } from '@dnd-kit/core';
import type { JSX } from 'react';
import { useCallback, useMemo } from 'react';

/** Edge of the single pane (fraction of its width) that counts as "drop to split right". */
const SPLIT_EDGE_RATIO = 0.7;

function resolveDropPane(event: DragEndEvent, split: boolean): PaneId | undefined {
  const start = event.activatorEvent as PointerEvent;
  const x = start.clientX + event.delta.x;
  const y = start.clientY + event.delta.y;

  for (const element of document.querySelectorAll<HTMLElement>('[data-pane]')) {
    const rect = element.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;

    const pane = Number(element.dataset.pane) as PaneId;
    if (split) return pane;
    return x >= rect.left + rect.width * SPLIT_EDGE_RATIO ? 1 : 0;
  }

  return undefined;
}

export default function PanelTabs(): JSX.Element {
  const pane = usePane() ?? 0;
  const tabs = useTabStore(selectTabs);
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);
  const reorderTabs = useTabStore((state) => state.reorderTabs);
  const moveTabToPane = useTabStore((state) => state.moveTabToPane);

  const tabList = useMemo(() => selectPaneTabs(tabs, currentConnectionId, pane), [tabs, currentConnectionId, pane]);
  const split = useMemo(() => isSplitActive(tabs, currentConnectionId), [tabs, currentConnectionId]);

  const handleReorder = useCallback(
    (activeId: string, overId: string): void => {
      reorderTabs(activeId, overId);
    },
    [reorderTabs]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent): boolean => {
      const target = resolveDropPane(event, split);
      if (target === undefined || target === pane) return false;

      moveTabToPane(String(event.active.id), target);
      return true;
    },
    [moveTabToPane, pane, split]
  );

  const renderTabItem = useCallback((tab: TabType, _index: number, meta: { overlay: boolean }): JSX.Element => {
    return <PanelTabItem tab={tab} overlay={meta.overlay} />;
  }, []);

  const getTabId = useCallback((tab: TabType): string => tab.id, []);

  return (
    <PanelTabsStyled>
      <SortableList
        items={tabList}
        onReorder={handleReorder}
        onDragEnd={handleDragEnd}
        renderItem={renderTabItem}
        getItemId={getTabId}
        direction='horizontal'
        activationDistance={8}
        className='panel-tabs-sortable'
      />
    </PanelTabsStyled>
  );
}
