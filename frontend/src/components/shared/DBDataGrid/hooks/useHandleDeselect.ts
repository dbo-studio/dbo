import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { HotTableClass } from '@handsontable/react';
import { type RefObject, useEffect } from 'react';

export const useHandleDeselect = (hotTableRef: RefObject<HotTableClass>) => {
  const { toggleClear } = useDataStore();

  useEffect(() => {
    const hot = hotTableRef?.current?.hotInstance;
    if (!hot) {
      return;
    }

    hot.deselectCell();
  }, [toggleClear]);
};
