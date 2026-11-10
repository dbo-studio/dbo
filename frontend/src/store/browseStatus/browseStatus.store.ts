import { create } from 'zustand';

/** What the active Browse grid reports to the app status bar ("N rows · 2 selected · 1 pending"). */
type BrowseStatus = { rows: number | null; selected: number; pending: number };

export const useBrowseStatusStore = create<BrowseStatus>(() => ({ rows: null, selected: 0, pending: 0 }));
