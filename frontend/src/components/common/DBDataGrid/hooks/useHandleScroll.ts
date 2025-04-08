import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { HotTableRef } from '@handsontable/react-wrapper';
import { type RefObject, useCallback, useEffect } from 'react';

export const useHandleScroll = (hotTableRef: RefObject<HotTableRef | null>): void => {
  const { getRows } = useDataStore();
  const { scrollToBottom, toggleScrollToBottom } = useSettingStore();

  const handleScrollToBottom = useCallback(() => {
    hotTableRef?.current?.hotInstance?.scrollViewportTo({ row: getRows().length - 1 });

    toggleScrollToBottom(false);
  }, []);

  useEffect(() => {
    if (scrollToBottom) {
      handleScrollToBottom();
    }
  }, [scrollToBottom]);
};
