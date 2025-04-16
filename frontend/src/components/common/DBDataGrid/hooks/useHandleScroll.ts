import { useSettingStore } from '@/store/settingStore/setting.store';
import type { RowType } from '@/types';
import type { HotTableRef } from '@handsontable/react-wrapper';
import { type RefObject, useCallback, useEffect } from 'react';

type UseHandleScrollProps = {
  hotTableRef: RefObject<HotTableRef | null>;
  rows: RowType[];
};

export const useHandleScroll = ({ hotTableRef, rows }: UseHandleScrollProps): void => {
  const { scrollToBottom, toggleScrollToBottom } = useSettingStore();

  const handleScrollToBottom = useCallback(() => {
    hotTableRef?.current?.hotInstance?.scrollViewportTo({ row: rows.length - 1 });

    toggleScrollToBottom(false);
  }, []);

  useEffect(() => {
    if (scrollToBottom) {
      handleScrollToBottom();
    }
  }, [scrollToBottom]);
};
