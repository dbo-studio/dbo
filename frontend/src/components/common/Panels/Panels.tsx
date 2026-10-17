'use no memo';

import ResizableXBox from '@/components/base/ResizableBox/ResizableXBox';
import Pane from '@/components/common/Panels/Pane/Pane';
import { PaneSplitStyled } from '@/components/common/Panels/Pane/Pane.styled';
import { shortcuts } from '@/core/utils';
import { useShortcut } from '@/hooks';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { selectTabs, useTabStore } from '@/store/tabStore/tab.store';
import { isSplitActive } from '@/store/tabStore/tabs';
import { type JSX, useCallback, useRef } from 'react';

const SECONDARY_WIDTH_KEY = 'split-pane-width';
const MIN_PANE_WIDTH = 240;

const readWidth = (fallback: number): number => {
  try {
    const stored = Number(localStorage.getItem(SECONDARY_WIDTH_KEY));
    return stored >= MIN_PANE_WIDTH ? stored : fallback;
  } catch {
    return fallback;
  }
};

const writeWidth = (width: number): void => {
  try {
    localStorage.setItem(SECONDARY_WIDTH_KEY, String(width));
  } catch {
    // storage unavailable; width just won't persist
  }
};

export default function Panels(): JSX.Element {
  const addEditorTab = useTabStore((state) => state.addEditorTab);
  const tabs = useTabStore(selectTabs);
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);
  const containerRef = useRef<HTMLDivElement>(null);
  const split = isSplitActive(tabs, currentConnectionId);

  const addNewEmptyTab = useCallback((): void => {
    addEditorTab();
  }, [addEditorTab]);

  useShortcut(shortcuts.newTab, addNewEmptyTab);

  const containerWidth = containerRef.current?.clientWidth ?? 0;
  const maxWidth = Math.max(MIN_PANE_WIDTH, containerWidth - MIN_PANE_WIDTH);

  return (
    <PaneSplitStyled ref={containerRef}>
      <Pane pane={0} split={split} />
      {split && (
        <ResizableXBox
          direction='ltr'
          width={Math.min(readWidth(Math.round((containerWidth || 1000) / 2)), maxWidth)}
          maxWidth={maxWidth}
          onChange={writeWidth}
        >
          <Pane pane={1} split={split} />
        </ResizableXBox>
      )}
    </PaneSplitStyled>
  );
}
