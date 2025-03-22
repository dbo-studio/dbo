import type { StateCreator } from 'zustand';
import type { DataFormDataSlice } from '../types';

export const createDataFormDataSlice: StateCreator<DataFormDataSlice, [], [], DataFormDataSlice> = (set, get) => ({
  formDataByTab: {},

  getFormData: (tabId: string, action: string) => {
    const key = `${tabId}${action}`;
    const formData = get().formDataByTab[key];
    return formData;
  },

  updateFormData: (tabId: string, action: string, data: any[]) => {
    const key = `${tabId}${action}`;

    set((state: DataFormDataSlice) => ({
      formDataByTab: {
        ...state.formDataByTab,
        [key]: data
      }
    }));
  },

  resetFormData: (tabId: string, action: string) => {
    const key = `${tabId}${action}`;

    set((state: DataFormDataSlice) => {
      const newState = { ...state.formDataByTab };
      delete newState[key];

      return {
        formDataByTab: newState
      };
    });
  }
});
