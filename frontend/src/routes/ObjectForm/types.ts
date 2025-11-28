import type { FormFieldOptionType, FormFieldWithState, ObjectTabType } from '@/types/Tree';

export type FormFieldWithValue = FormFieldWithState;

export type FormValue = string | number | boolean | string[] | null | undefined;

export type FormTabProps = {
  tabs: ObjectTabType[];
  selectedTabId: string | null;
  onTabChange: (tabId: string) => void;
};

export type SimpleFormProps = {
  schema: FormFieldWithValue[];
  data?: Record<string, FormValue>;
  onFieldChange: (fieldId: string, value: FormValue) => void;
};

export type ArrayFormProps = {
  schema: FormFieldWithValue[];
  data: Record<string, FormValue>[];
  onDataChange: (data: Record<string, FormValue>[]) => void;
};

export type ArrayRowProps = {
  schema: FormFieldWithValue[];
  rowData: Record<string, FormValue>;
  onFieldChange: (fieldId: string, value: FormValue) => void;
  onDelete: () => void;
};

export type SimpleFieldProps = {
  field: FormFieldWithValue;
  onChange: (value: FormValue) => void;
  dynamicOptions?: FormFieldOptionType[];
  isLoadingDynamic?: boolean;
  isArrayForm?: boolean;
};

export type FormStatusBarProps = {
  onSave: () => void;
  onCancel: () => void;
  onAddRow?: () => void;
  isArrayForm?: boolean;
  disabled?: boolean;
};

export type FormDataState = {
  schema: FormFieldWithValue[];
  data: Record<string, FormValue>[];
  isArray: boolean;
  originalData?: Record<string, FormValue>[];
};
