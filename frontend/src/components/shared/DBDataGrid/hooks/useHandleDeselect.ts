import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { HotTableRef } from '@handsontable/react-wrapper';
import { type RefObject, useEffect } from 'react';

export const useHandleDeselect = (hotTableRef: RefObject<HotTableRef | null>): void => {
  const { toggleClear } = useDataStore();

  useEffect(() => {
    const hot = hotTableRef?.current?.hotInstance;
    if (!hot) {
      return;
    }

    hot.deselectCell();
  }, [toggleClear]);
};
