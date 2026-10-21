import type { ChartReport } from '@/components/common/AiChatPanel/utils/chartReport';
import { create } from 'zustand';

export type CanvasTab = 'diagram' | 'diff' | 'data' | 'report' | 'sql';

type WorkspaceCanvasState = {
  tab: CanvasTab;
  /** Set when a chat card asks the canvas to show it; cleared once the canvas opened it. */
  open: boolean;
  /** The report the Report tab shows when the user picked one (a chat card or a saved report). */
  report?: ChartReport;
  setTab: (tab: CanvasTab, open?: boolean) => void;
  showReport: (report: ChartReport) => void;
  closeRequest: () => void;
};

/** Which canvas tab the workstation shows; chat cards can ask for one. */
export const useWorkspaceCanvas = create<WorkspaceCanvasState>((set) => ({
  tab: 'diff',
  open: false,
  setTab: (tab, open = false) => set({ tab, open }),
  showReport: (report) => set({ report, tab: 'report', open: true }),
  closeRequest: () => set({ open: false })
}));
