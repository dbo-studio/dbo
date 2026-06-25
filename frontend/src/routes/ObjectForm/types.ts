import type { ObjectTabType } from '@/types/Tree';

export type FormTabProps = {
  tabs: ObjectTabType[];
  selectedTabId: string | null;
  onTabChange: (tabId: string) => void;
};

export type FormStatusBarProps = {
  onSave: () => void;
  onCancel: () => void;
  onAddRow?: () => void;
  onAiSuggest?: () => void;
  isArrayForm?: boolean;
  disabled?: boolean;
};
