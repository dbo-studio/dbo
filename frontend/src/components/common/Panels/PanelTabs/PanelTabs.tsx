import PanelTabItem from '@/components/common/Panels/PanelTabs/PanelTabItem/PanelTabItem.tsx';
import { PanelTabsStyled } from '@/components/common/Panels/PanelTabs/PanelTabs.styled.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { TabType } from '@/types';

export default function PanelTabs() {
  const getTabs = useTabStore((state) => state.getTabs);

  return (
    <PanelTabsStyled>
      {getTabs().map((tab: TabType) => (
        <PanelTabItem tab={tab} key={tab.id} />
      ))}
    </PanelTabsStyled>
  );
}
