import type { PaneId } from '@/store/tabStore/tabs';
import { createContext, use } from 'react';

/** Set by a split-view pane. Undefined outside panes (explorer, header, dialogs). */
export const PaneContext = createContext<PaneId | undefined>(undefined);

export const usePane = (): PaneId | undefined => use(PaneContext);
