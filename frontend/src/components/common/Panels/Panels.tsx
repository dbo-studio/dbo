import PanelItem from '@/components/common/Panels/PanelItem/PanelItem.tsx';
import PanelTabs from '@/components/common/Panels/PanelTabs/PanelTabs.tsx';
import { shortcuts } from '@/core/utils';
import { useShortcut } from '@/hooks';
import { useTabStore } from '@/store/tabStore/tab.store';
import { type JSX, useCallback } from 'react';

export default function Panels(): JSX.Element {
  const addEditorTab = useTabStore((state) => state.addEditorTab);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

  const addNewEmptyTab = useCallback((): void => {
    const tab = addEditorTab();
    updateSelectedTab(tab);
  }, [addEditorTab, updateSelectedTab]);

  useShortcut(shortcuts.newTab, addNewEmptyTab);

  return (
    <>
      <PanelTabs />
      <PanelItem />
    </>
  );
}
