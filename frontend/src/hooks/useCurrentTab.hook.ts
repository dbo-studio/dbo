import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useParams } from 'react-router-dom';

export const useCurrentTab = (): TabType | undefined => {
  const { tabId } = useParams();
  const { tabs } = useTabStore();

  return tabs.find((tab) => tab.id === tabId);
};
