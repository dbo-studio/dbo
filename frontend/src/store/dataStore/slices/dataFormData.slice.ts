import { useTabStore } from '@/store/tabStore/tab.store';
import type { FormFieldWithState } from '@/types/Tree';
import type { StateCreator } from 'zustand';
import type { DataFormDataSlice } from '../types';

export const createDataFormDataSlice: StateCreator<
  DataFormDataSlice,
  [['zustand/devtools', never]],
  [],
  DataFormDataSlice
> = (set, get) => ({
  formDataByTab: {},

  getFormData: (tabId: string, objectTabId: string): FormFieldWithState[] | undefined => {
    const formData = get().formDataByTab?.[tabId]?.[objectTabId];
    return formData as FormFieldWithState[] | undefined;
  },

  updateFormData: (tabId: string, objectTabId: string, data: FormFieldWithState[]): void => {
    if (!tabId || !objectTabId) return;

    set(
      (state: DataFormDataSlice) => {
        const currentTabData = state.formDataByTab[tabId] || {};

        return {
          formDataByTab: {
            ...state.formDataByTab,
            [tabId]: {
              ...currentTabData,
              [objectTabId]: data
            }
          }
        };
      },
      undefined,
      'updateFormData'
    );
  },

  resetFormData: (tabId: string, objectTabId: string): void => {
    const selectedTabId = useTabStore.getState().selectedTabId;
    if (!selectedTabId) return;

    set(
      (state) => {
        const currentTabData = state.formDataByTab[tabId] || {};
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [objectTabId]: _ignored, ...remainingData } = currentTabData;

        return {
          formDataByTab: {
            ...state.formDataByTab,
            [tabId]: remainingData
          }
        };
      },
      undefined,
      'resetFormData'
    );
  }
});
