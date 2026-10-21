import { create } from 'zustand';

export type CanvasTab = 'diagram' | 'diff' | 'data' | 'report' | 'sql';

type WorkspaceCanvasState = {
  tab: CanvasTab;
  /** Set when a chat card asks the canvas to show it; cleared once the canvas opened it. */
  open: boolean;
  setTab: (tab: CanvasTab, open?: boolean) => void;
  closeRequest: () => void;
};

/** Which canvas tab the workstation shows; chat cards can ask for one. */
export const useWorkspaceCanvas = create<WorkspaceCanvasState>((set) => ({
  tab: 'diff',
  open: false,
  setTab: (tab, open = false) => set({ tab, open }),
  closeRequest: () => set({ open: false })
}));
