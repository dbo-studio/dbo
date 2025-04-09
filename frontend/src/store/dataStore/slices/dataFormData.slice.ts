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
    set((state: DataFormDataSlice) => ({
      formDataByTab: {
        ...state.formDataByTab,
        [tabId]: {
          ...state.formDataByTab[tabId],
          [objectTabId]: data
        }
      }
    }));
  },

  resetFormData: (tabId: string, objectTabId: string): void => {
    const selectedTabId = useTabStore.getState().selectedTabId;
    if (!selectedTabId) return;

    const newState = { ...get().formDataByTab[selectedTabId] };
    delete newState[tabId][objectTabId];

    set({ formDataByTab: newState });
  }
});
