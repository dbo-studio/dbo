import { StateCreator } from 'zustand';
import { AutocompleteSlice } from '../types';

export const createAutocompleteSlice: StateCreator<AutocompleteSlice, [], [], AutocompleteSlice> = (set, get) => ({
  autoComplete: undefined,
  updateAutocomplete: (data: any): void => {
    set({ autoComplete: data });
  }
});
