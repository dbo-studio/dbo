'use no memo';

import PanelItem from '@/components/common/Panels/PanelItem/PanelItem';
import PanelTabs from '@/components/common/Panels/PanelTabs/PanelTabs';
import { PaneContext } from '@/hooks/usePane';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { PaneId } from '@/store/tabStore/tabs';
import type { JSX } from 'react';
import { PaneStyled } from './Pane.styled';

type PaneProps = {
  pane: PaneId;
  split: boolean;
};

export default function Pane({ pane, split }: PaneProps): JSX.Element {
  const focusPane = useTabStore((state) => state.focusPane);
  const focused = useTabStore((state) => state.focusedPane === pane);

  return (
    <PaneContext value={pane}>
      <PaneStyled
        data-pane={pane}
        data-testid={`workspace-pane-${pane}`}
        data-focused={split && focused ? 'true' : undefined}
        focused={split && focused}
        onMouseDownCapture={(): void => focusPane(pane)}
      >
        <PanelTabs />
        <PanelItem />
      </PaneStyled>
    </PaneContext>
  );
}
