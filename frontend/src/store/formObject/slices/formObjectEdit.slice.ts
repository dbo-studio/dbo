import { FormFieldType } from '@/types/Tree';
import type { StateCreator } from 'zustand';
import type { FormObjectStore } from '../types';

export const createFormObjectEditSlice: StateCreator<
  FormObjectStore,
  [['zustand/devtools', never]],
  [],
  Pick<FormObjectStore, 'updateGeneralField' | 'updateFormField' | 'addRow' | 'markRowDeleted' | 'hardRemoveRow'>
> = (set, get) => ({
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
  }
});
