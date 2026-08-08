import { FormObjectResponseType } from '@/api/tree/types';
import { FormFieldType } from '@/types/Tree';
import { create, StoreApi, UseBoundStore } from 'zustand';
import { devtools } from 'zustand/middleware';
import { FormObjectData, FormObjectStore } from './types';

const commitFormObjectData = (tab: FormObjectData): FormObjectData => {
  const committedGeneral = tab.general.map((field) => ({
    ...field,
    originalValue: field.value
  }));

  const committedData = tab.data
    .filter((row) => !row.some((cell) => cell.deleted))
    .map((row) =>
      row.map((cell) => ({
        ...cell,
        originalValue: cell.value,
        added: false,
        deleted: false,
        updated: false
      }))
    );

  return {
    ...tab,
    general: committedGeneral,
    data: committedData
  };
};

export const useFormObjectStore: UseBoundStore<StoreApi<FormObjectStore>> = create<FormObjectStore>()(
  devtools(
    (set, get) => ({
      formDataByTab: {},

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
      },

      updateGeneralField: (objectPrefix, fieldId, value) => {
        const prefix = `${objectPrefix}_`;

        return set(
          (state) => {
            const updatedTabs = { ...state.formDataByTab };

            for (const [tabKey, tab] of Object.entries(updatedTabs)) {
              if (!tabKey.startsWith(prefix)) continue;

              updatedTabs[tabKey] = {
                ...tab,
                general: tab.general.map((f) =>
                  f.id === fieldId
                    ? {
                        ...f,
                        value
                      }
                    : f
                )
              };
            }

            return { formDataByTab: updatedTabs };
          },
          false,
          'updateGeneralField'
        );
      },

      updateFormField: (tabId, rowIndex, fieldId, value) => {
        set(
          (state) => {
            const tab = state.formDataByTab[tabId];
            if (!tab) return state;

            const newRows = tab.data.map((row, rIdx) => {
              if (rIdx !== rowIndex) return row;

              return row.map((cell) =>
                cell.id === fieldId
                  ? {
                      ...cell,
                      value,
                      updated: true
                    }
                  : cell
              );
            });

            return {
              formDataByTab: {
                ...state.formDataByTab,
                [tabId]: {
                  ...tab,
                  data: newRows
                }
              }
            };
          },
          false,
          'updateFormField'
        );
      },

      addRow: (tabId) => {
        return set(
          (state) => {
            const tab = state.formDataByTab[tabId];
            if (!tab) return state;

            const newRow: FormFieldType[] = tab.schema.map((col) => ({
              ...col,
              value: '',
              originalValue: undefined,
              added: true,
              deleted: false,
              updated: false
            }));

            const newData = [...tab.data, newRow];
            return {
              formDataByTab: {
                ...state.formDataByTab,
                [tabId]: {
                  ...tab,
                  data: newData
                }
              }
            };
          },
          false,
          'addRow'
        );
      },

      markRowDeleted: (tabId, row, deleted = true) => {
        const tab = get().formDataByTab[tabId];
        if (!tab) return;

        const newData = tab.data.map((dataRow) => {
          if (dataRow[0].value !== row[0].value) return dataRow;

          return row.map((cell) => ({
            ...cell,
            deleted
          }));
        });

        set(
          (state) => ({
            formDataByTab: {
              ...state.formDataByTab,
              [tabId]: {
                ...tab,
                data: newData
              }
            }
          }),
          false,
          'markRowDeleted'
        );
      },

      hardRemoveRow: (tabId, rowIndex) => {
        return set(
          (state) => {
            const tab = state.formDataByTab[tabId];
            if (!tab) return state;

            const newData = tab.data.filter((_, rIdx) => rIdx !== rowIndex);
            return {
              formDataByTab: {
                ...state.formDataByTab,
                [tabId]: {
                  ...tab,
                  data: newData
                }
              }
            };
          },
          false,
          'hardRemoveRow'
        );
      },

      resetTab: (tabId: string) => {
        return set(
          (state) => {
            const tab = state.formDataByTab[tabId];
            if (!tab) return state;

            const resetGeneral = tab.general.map((field) => ({
              ...field,
              value: field.originalValue,
              updated: false,
              deleted: false
            }));

            const resetData = tab.data
              .filter((row) => !row.some((cell) => cell.added))
              .map((row) =>
                row.map((cell) => ({
                  ...cell,
                  value: cell.originalValue,
                  updated: false,
                  deleted: false,
                  added: false
                }))
              );

            return {
              formDataByTab: {
                ...state.formDataByTab,
                [tabId]: {
                  ...tab,
                  general: resetGeneral,
                  data: resetData
                }
              }
            };
          },
          undefined,
          'resetTab'
        );
      },

      commitTab: (tabId) => {
        return set(
          (state) => {
            const tab = state.formDataByTab[tabId];
            if (!tab) return state;

            return {
              formDataByTab: {
                ...state.formDataByTab,
                [tabId]: commitFormObjectData(tab)
              }
            };
          },
          false,
          'commitTab'
        );
      },

      commitAllTabs: (objectPrefix) => {
        const prefix = `${objectPrefix}_`;

        return set(
          (state) => {
            const updatedTabs = { ...state.formDataByTab };

            for (const [tabKey, tab] of Object.entries(updatedTabs)) {
              if (!tabKey.startsWith(prefix)) continue;
              updatedTabs[tabKey] = commitFormObjectData(tab);
            }

            return { formDataByTab: updatedTabs };
          },
          false,
          'commitAllTabs'
        );
      },

      clearTabsByPrefix: (objectPrefix) => {
        const prefix = `${objectPrefix}_`;

        return set(
          (state) => {
            const updatedTabs = { ...state.formDataByTab };

            for (const tabKey of Object.keys(updatedTabs)) {
              if (tabKey.startsWith(prefix)) {
                delete updatedTabs[tabKey];
              }
            }

            return { formDataByTab: updatedTabs };
          },
          false,
          'clearTabsByPrefix'
        );
      }
    }),
    { name: 'formObject' }
  )
);

const mapResponseIntoFormObject = (response: FormObjectResponseType): FormObjectData => {
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

//for e2e testing
if (import.meta.env.DEV) {
  (globalThis as typeof globalThis & { __FORM_OBJECT_STORE__?: typeof useFormObjectStore }).__FORM_OBJECT_STORE__ =
    useFormObjectStore;
}
