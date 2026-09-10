import { create, StoreApi, UseBoundStore } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createFormObjectDirtySlice } from './slices/formObjectDirty.slice';
import { createFormObjectEditSlice } from './slices/formObjectEdit.slice';
import { createFormObjectLoadSlice } from './slices/formObjectLoad.slice';
import { FormObjectStore } from './types';

export const useFormObjectStore: UseBoundStore<StoreApi<FormObjectStore>> = create<FormObjectStore>()(
  devtools(
    (set, get, ...state) => ({
      formDataByTab: {},
      ...createFormObjectLoadSlice(set, get, ...state),
      ...createFormObjectEditSlice(set, get, ...state),
      ...createFormObjectDirtySlice(set, get, ...state)
    }),
    { name: 'formObject' }
  )
);

//for e2e testing
if (import.meta.env.DEV) {
  (globalThis as typeof globalThis & { __FORM_OBJECT_STORE__?: typeof useFormObjectStore }).__FORM_OBJECT_STORE__ =
    useFormObjectStore;
}
