import type { FormFieldOptionType, FormFieldType, FormValue, ObjectTabType } from '@/types/Tree';

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

export type ArrayRowProps = {
  rowIndex: number;
  rows: FormFieldType[];
  getDynamicFieldStateKey: (scopeId: string | number, fieldId: string) => string;
  getDynamicOptions: (id: string) => FormFieldOptionType[];
  isLoadingDynamicField: (id: string) => boolean;
  onFieldChange: (field: FormFieldType, value: FormValue | FormValue[]) => void;
  onDelete: () => void;
};

export type QueryPreviewModalProps = {
  open: boolean;
  queries: string[];
  isExecuting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};
