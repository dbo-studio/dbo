import type { StateCreator } from 'zustand';
import type { FormObjectData, FormObjectStore } from '../types';

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

export const createFormObjectDirtySlice: StateCreator<
  FormObjectStore,
  [['zustand/devtools', never]],
  [],
  Pick<FormObjectStore, 'resetTab' | 'commitTab' | 'commitAllTabs' | 'clearTabsByPrefix'>
> = (set) => ({
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
});
