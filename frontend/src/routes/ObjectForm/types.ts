import type { ObjectTabType } from '@/api/tree/types';

export type ObjectTabProps = {
  tabs: ObjectTabType[];
  selectedTabIndex: number;
  setSelectedTabIndex: (index: number) => void;
};
