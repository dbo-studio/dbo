import { TabMode } from '@/core/enums';
import { matchConnectionId } from '@/store/tabStore/connectionId';
import type { TabType } from '@/types/Tab';

export const siblingObjectNodeIds = (tabs: TabType[], connectionId: string | number | undefined): string[] => {
  if (connectionId === undefined || connectionId === null || connectionId === '') {
    return [];
  }

  return tabs
    .filter(
      (tab) =>
        matchConnectionId(tab.connectionId, connectionId) &&
        (tab.mode === TabMode.Data || tab.mode === TabMode.Object || tab.mode === TabMode.ObjectDetail) &&
        !!tab.nodeId
    )
    .map((tab) => tab.nodeId);
};
