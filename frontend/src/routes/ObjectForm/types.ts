import type { FormFieldOption, FormFieldType, ObjectTabType } from '@/api/tree/types';

export type ObjectTabProps = {
  tabs: ObjectTabType[];
  selectedTabIndex: string;
  setSelectedTabIndex: (index: string) => void;
};

export type ArrayFieldProps = {
  field: FormFieldType;
  onChange: (field: FormFieldType) => void;
};

export type FormFieldsProps = {
  fields: FormFieldType[];
  onChange: (fieldId: string, value: any) => void;
};

export type SimpleFieldProps = {
  field: FormFieldType;
  onChange: (value: any) => void;
  size?: 'small' | 'medium';
  dynamicOptions?: FormFieldOption[];
  isLoadingDynamic?: boolean;
};

export type TableFormProps = {
  formSchema: FormFieldType[];
};

export type StatusBarProps = {
  onSave: () => void;
  onCancel: () => void;
  onAdd?: () => void;
  disabled?: boolean;
};
