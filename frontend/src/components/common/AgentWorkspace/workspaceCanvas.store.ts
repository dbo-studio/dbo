import type { ChartReport } from '@/components/common/AiChatPanel/utils/chartReport';
import type { QueryResult } from '@/components/common/AiChatPanel/utils/queryResult';
import { create } from 'zustand';

/** How a proposal is shown: drawn as tables, as a before/after diff, or as the SQL it will run. */
export type ProposalView = 'design' | 'diff' | 'sql';

/** Something the agent made, open as a tab on the canvas, like a file in an editor. */
export type CanvasArtifact =
  | { id: string; kind: 'result'; result: QueryResult }
  | { id: string; kind: 'report'; report: ChartReport }
  | { id: string; kind: 'proposal'; changesetId: number }
  | { id: string; kind: 'board'; boardId: number };

type WorkspaceCanvasState = {
  artifacts: CanvasArtifact[];
  activeId?: string;
  proposalView: ProposalView;
  /** Whether the canvas is shown beside the chat; opening an artifact shows it. */
  visible: boolean;
  setVisible: (visible: boolean) => void;
  /** Opens the artifact as a tab, or brings its tab forward with the newest content. */
  open: (artifact: CanvasArtifact) => void;
  close: (id: string) => void;
  activate: (id: string) => void;
  setProposalView: (view: ProposalView) => void;
  openProposal: (changesetId: number, view?: ProposalView) => void;
  showReport: (report: ChartReport) => void;
  showBoard: (boardId: number) => void;
  /** Another chat: its artifacts are not this one's. */
  reset: () => void;
};

export const reportArtifactId = (report: ChartReport): string =>
  report.questionId ? `question-${report.questionId}` : `chart-${report.id}`;

export const useWorkspaceCanvas = create<WorkspaceCanvasState>((set, get) => ({
  artifacts: [],
  proposalView: 'diff',
  visible: true,
  setVisible: (visible) => set({ visible }),
  open: (artifact) =>
    set((state) => ({
      artifacts: state.artifacts.some((item) => item.id === artifact.id)
        ? state.artifacts.map((item) => (item.id === artifact.id ? artifact : item))
        : [...state.artifacts, artifact],
      activeId: artifact.id,
      visible: true
    })),
  close: (id) =>
    set((state) => {
      const index = state.artifacts.findIndex((item) => item.id === id);
      const artifacts = state.artifacts.filter((item) => item.id !== id);
      // Closing the open tab shows its neighbour, as editors do.
      const activeId = state.activeId === id ? artifacts[Math.min(index, artifacts.length - 1)]?.id : state.activeId;
      return { artifacts, activeId };
    }),
  activate: (id) => set({ activeId: id }),
  setProposalView: (proposalView) => set({ proposalView }),
  openProposal: (changesetId, view) => {
    if (view) set({ proposalView: view });
    get().open({ id: `proposal-${changesetId}`, kind: 'proposal', changesetId });
  },
  showReport: (report) => get().open({ id: reportArtifactId(report), kind: 'report', report }),
  showBoard: (boardId) => get().open({ id: `board-${boardId}`, kind: 'board', boardId }),
  reset: () => set({ artifacts: [], activeId: undefined })
}));
