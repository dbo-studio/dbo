import { createContext } from 'react';

/** SQL an assistant code block is diffed against: the user's selection (latest turn) or the previous SQL answer. */
export const DiffBaselineContext = createContext<string | undefined>(undefined);
