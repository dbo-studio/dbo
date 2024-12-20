import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { HotTableRef } from '@handsontable/react-wrapper';
import { type RefObject, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useHandleScroll = (hotTableRef: RefObject<HotTableRef | null>) => {
  const { getRows } = useDataStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const scrollToBottom = useCallback(() => {
    hotTableRef?.current?.hotInstance?.scrollViewportTo({ row: getRows().length - 1 });

    searchParams.delete('scrollToBottom');
    setSearchParams(searchParams);
  }, []);

  useEffect(() => {
    if (searchParams.get('scrollToBottom') === 'true') {
      scrollToBottom();
    }
  }, [searchParams]);
};
