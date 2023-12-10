import { StateCreator } from "zustand";

export interface TabSlice {
  query: string;
  updateQuery: (query: string) => void;
}

export const createTabSlice: StateCreator<TabSlice> = (set) => ({
  query: "test query",
  updateQuery: (query: string) => {
    set({ query });
  },
});
