import type { FormFieldType, ObjectTabType } from '@/api/tree/types';

export type ObjectTabProps = {
  tabs: ObjectTabType[];
  selectedTabIndex: string;
  setSelectedTabIndex: (index: string) => void;
};

export type ArrayFieldProps = {
  field: FormFieldType;
  onChange: (value: any[]) => void;
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
  formSchema: FormFieldType[];
  formData?: Record<string, any>;
  onFieldChange?: (fieldId: string, value: any) => void;
  onArrayFieldChange?: (fieldId: string, value: any[]) => void;
  onAddArrayItem?: (fieldId: string) => void;
  showStatusBar?: boolean;
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
};

export type StatusBarProps = {
  onSave: () => void;
  onCancel: () => void;
  onAdd?: () => void;
  disabled?: boolean;
};
