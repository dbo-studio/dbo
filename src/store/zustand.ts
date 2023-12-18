import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { TabSlice, createTabSlice } from './slices/createTabSlice';

// type StoreState = TabSlice & CartSlice;
type StoreState = TabSlice;

export const useAppStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...createTabSlice(...a)
      }),
      { name: 'dto' }
    )
  )
);
