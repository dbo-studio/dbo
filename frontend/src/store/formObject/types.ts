import { FormObjectResponseType } from '@/api/tree/types';
import { FormFieldType, FormSchemaType, FormValue, GeneralFieldType } from '@/types/Tree';

export type FormObjectData = {
  general: GeneralFieldType[];
  schema: FormSchemaType[];
  data: FormFieldType[][];
};

export type FormObjectStore = {
  formDataByTab: Record<string, FormObjectData>;

  getFormData: (tabId: string) => FormObjectData | undefined;

  setFormObject: (tabId: string, formObject: FormObjectResponseType) => void;

  updateGeneralField: (objectPrefix: string, fieldId: string, value: FormValue | FormValue[]) => void;

  updateFormField: (tabId: string, rowIndex: number, fieldId: string, value: FormValue | FormValue[]) => void;

  addRow: (tabId: string) => void;

  markRowDeleted: (tabId: string, row: FormFieldType[], deleted?: boolean) => void;

  hardRemoveRow?: (tabId: string, rowIndex: number) => void;

  resetTab: (tabId: string) => void;

  commitTab: (tabId: string) => void;

  commitAllTabs: (objectPrefix: string) => void;

  clearTabsByPrefix: (objectPrefix: string) => void;
};
