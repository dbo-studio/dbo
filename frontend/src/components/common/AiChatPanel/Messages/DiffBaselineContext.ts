import { createContext } from 'react';

/** SQL the user selected before asking; assistant code blocks in the latest turn can be diffed against it. */
export const DiffBaselineContext = createContext<string | undefined>(undefined);
