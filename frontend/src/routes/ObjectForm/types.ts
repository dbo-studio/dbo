import type { FormFieldType, ObjectTabType } from '@/api/tree/types';

export type ObjectTabProps = {
  tabs: ObjectTabType[];
  selectedTabIndex: number;
  setSelectedTabIndex: (index: number) => void;
};

export type ArrayFieldProps = {
  field: FormFieldType;
  onChange: (value: any[]) => void;
  onAdd?: () => void;
};

export type FormFieldsProps = {
  fields: FormFieldType[];
  onChange: (fieldId: string, value: any) => void;
};

export type SimpleFieldProps = {
  field: FormFieldType;
  onChange: (value: any) => void;
  size?: 'small' | 'medium';
};

export type TableFormProps = {
  tabId: string | undefined;
  formSchema: FormFieldType[];
};

export type StatusBarProps = {
  onSave: () => void;
  onCancel: () => void;
  onAdd?: () => void;
  disabled?: boolean;
};
