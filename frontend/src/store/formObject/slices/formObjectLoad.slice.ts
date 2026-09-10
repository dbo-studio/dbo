import { FormObjectResponseType } from '@/api/tree/types';
import { FormFieldType } from '@/types/Tree';
import type { StateCreator } from 'zustand';
import type { FormObjectData, FormObjectStore } from '../types';

export const mapResponseIntoFormObject = (response: FormObjectResponseType): FormObjectData => {
  const { general, schema, data } = response;

  const mappedData: FormFieldType[][] = data.map((rowObj) =>
    schema.map((column) => {
      const rawValue = rowObj[column.id];
      const emptyValue = column.type === 'checkbox' ? false : '';
      const value = rawValue ?? emptyValue;

      return {
        ...column,
        value,
        originalValue: value,
        added: false,
        deleted: false,
        updated: false
      };
    })
  );

  const mappedGeneral = (general ?? []).map((g) => ({
    ...g,
    originalValue: g.value
  }));

  return {
    general: mappedGeneral,
    schema,
    data: mappedData
  };
};

export const createFormObjectLoadSlice: StateCreator<
  FormObjectStore,
  [['zustand/devtools', never]],
  [],
  Pick<FormObjectStore, 'getFormData' | 'setFormObject'>
> = (set, get) => ({
  getFormData: (tabId) => {
    return get().formDataByTab[tabId];
  },

  setFormObject: (tabId, formObject) => {
    const mapped = mapResponseIntoFormObject(formObject);

    set(
      (state) => ({
        formDataByTab: {
          ...state.formDataByTab,
          [tabId]: mapped
        }
      }),
      false,
      'setFormObject'
    );
  }
});
