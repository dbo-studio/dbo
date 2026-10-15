import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import ScreenHeader from '@/components/base/ScreenHeader/ScreenHeader';
import MobileTableData from '@/components/common/MobileTableData/MobileTableData';
import PanelItem from '@/components/common/Panels/PanelItem/PanelItem';
import TabSwitcherSheet from '@/components/common/TabSwitcherSheet/TabSwitcherSheet';
import { tabTitle } from '@/components/common/TabSwitcherSheet/utils';
import { TabMode } from '@/core/enums';
import { useConnectionTabs, useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Badge, IconButton } from '@mui/material';
import { type JSX, useState } from 'react';
import { ScreenBodyStyled } from '../../MobileShell.styled';
import ScreenEmptyState from '../ScreenEmptyState/ScreenEmptyState';

/** Data tabs get the card view; every other tab renders its own content under a mobile header instead of the desktop tab strip. */
export default function QueryScreen(): JSX.Element {
  const tabs = useConnectionTabs();
  const selectedTab = useSelectedTab();
  const addEditorTab = useTabStore((state) => state.addEditorTab);
  const removeTab = useTabStore((state) => state.removeTab);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  if (tabs.length === 0) {
    return (
      <>
        <ScreenHeader title={locales.mobile_tab_query} />
        <ScreenEmptyState
          icon='code'
          message={locales.mobile_query_empty}
          actionLabel={locales.open_editor}
          onAction={(): void => void addEditorTab()}
        />
      </>
    );
  }

  if (selectedTab?.mode === TabMode.Data) {
    return <MobileTableData />;
  }

  // Settings opens as a workspace tab on desktop; on phones it needs a way out that lands on the previous tab.
  const settingsTab = selectedTab?.mode === TabMode.Settings ? selectedTab : undefined;

  return (
    <>
      <ScreenHeader
        title={tabTitle(selectedTab) || locales.mobile_tab_query}
        onBack={settingsTab ? (): void => void removeTab(settingsTab.id) : undefined}
        actions={
          <>
            <IconButton aria-label={locales.open_editor} onClick={(): void => void addEditorTab(undefined, { forceNew: true })}>
              <CustomIcon type='plus' size='m' />
            </IconButton>
            <IconButton aria-label={locales.mobile_open_tabs} onClick={(): void => setSwitcherOpen(true)}>
              <Badge badgeContent={tabs.length} color='primary'>
                <CustomIcon type='copy' size='m' />
              </Badge>
            </IconButton>
          </>
        }
      />
      <ScreenBodyStyled>
        <PanelItem />
      </ScreenBodyStyled>
      {switcherOpen && <TabSwitcherSheet onClose={(): void => setSwitcherOpen(false)} />}
    </>
  );
}
