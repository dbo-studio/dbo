import { useTabStore } from '@/store/tabStore/tab.store';
import type { StateCreator } from 'zustand';
import type { DataFormDataSlice } from '../types';

export const createDataFormDataSlice: StateCreator<DataFormDataSlice, [], [], DataFormDataSlice> = (set, get) => ({
  formDataByTab: {},

  getFormData: (tabId: string, objectTabId: string): any[] | undefined => {
    const formData = get().formDataByTab?.[tabId]?.[objectTabId];
    return formData;
  },

  updateFormData: (tabId: string, objectTabId: string, data: any[]): void => {
    if (!tabId || !objectTabId) return;

    set((state: DataFormDataSlice) => {
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
    });
  },

  resetFormData: (tabId: string, objectTabId: string): void => {
    const selectedTabId = useTabStore.getState().selectedTabId;
    if (!selectedTabId) return;

    set((state) => {
      const currentTabData = state.formDataByTab[tabId] || {};
      const { [objectTabId]: _, ...remainingData } = currentTabData;

      return {
        formDataByTab: {
          ...state.formDataByTab,
          [tabId]: remainingData
        }
      };
    });
  }
});
