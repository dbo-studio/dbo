import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { HotTableRef } from '@handsontable/react-wrapper';
import { type RefObject, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useHandleScroll = (hotTableRef: RefObject<HotTableRef | null>): void => {
  const selectedTab = useSelectedTab();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getRows } = useDataStore();

  const scrollToBottom = useCallback(() => {
    hotTableRef?.current?.hotInstance?.scrollViewportTo({ row: getRows(selectedTab).length - 1 });

    searchParams.delete('scrollToBottom');
    setSearchParams(searchParams);
  }, []);

  useEffect(() => {
    if (searchParams.get('scrollToBottom') === 'true') {
      scrollToBottom();
    }
  }, [searchParams]);
};
