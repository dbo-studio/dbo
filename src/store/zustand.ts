import { create } from "zustand";

import { TabSlice, createTabSlice } from "./slices/createTabSlice";

// type StoreState = TabSlice & CartSlice;
type StoreState = TabSlice;

export const useAppStore = create<StoreState>()((...a) => ({
  ...createTabSlice(...a),
}));
