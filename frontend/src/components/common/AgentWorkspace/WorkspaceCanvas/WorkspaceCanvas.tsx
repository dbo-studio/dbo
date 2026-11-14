import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import api from '@/api';
import { changeCount } from '@/core/ai/changeCount';
import locales from '@/locales';
import { useChangesetStore } from '@/store/changesetStore/changeset.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import SidebarSectionTabs from '@/components/base/SidebarSectionTabs/SidebarSectionTabs';
import { Box, IconButton, Tooltip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import BoardView from '../BoardView/BoardView';
import ProposalView from '../ProposalView/ProposalView';
import ReportEditor from '../ReportEditor/ReportEditor';
import ResultGrid from '../ResultGrid/ResultGrid';
import { useWorkspaceCanvas, type CanvasArtifact } from '../workspaceCanvas.store';
import {
  WorkspaceCanvasBodyStyled,
  WorkspaceCanvasHeaderStyled,
  WorkspaceCanvasStyled
} from './WorkspaceCanvas.styled';

type WorkspaceCanvasProps = {
  fullScreen: boolean;
  onToggleFullScreen: () => void;
  onClose: () => void;
};

const ICONS = { result: 'grid', report: 'layout', proposal: 'structure', board: 'layoutList' } as const;

/**
 * The workstation's canvas, like an editor beside the chat: everything the agent makes (a query result,
 * a chart, a proposal, a board) opens as its own tab, and the chat only links to it.
 */
export default function WorkspaceCanvas({
  fullScreen,
  onToggleFullScreen,
  onClose
}: WorkspaceCanvasProps): JSX.Element {
  const artifacts = useWorkspaceCanvas((state) => state.artifacts);
  const activeId = useWorkspaceCanvas((state) => state.activeId);
  const activate = useWorkspaceCanvas((state) => state.activate);
  const close = useWorkspaceCanvas((state) => state.close);
  const changesets = useChangesetStore((state) => state.changesets);
  const connectionId = Number(useConnectionStore((state) => state.currentConnectionId));
  const { data: boards } = useQuery({
    queryKey: ['dashboards', connectionId],
    queryFn: () => api.dashboard.getDashboards(connectionId),
    // Lists change behind this screen (the agent saves and pins), so a stale one reloads on open.
    refetchOnMount: true,
    enabled: !!connectionId && artifacts.some((item) => item.kind === 'board')
  });
  const active = artifacts.find((item) => item.id === activeId) ?? artifacts[artifacts.length - 1];

  const label = (artifact: CanvasArtifact): string => {
    switch (artifact.kind) {
      case 'result':
        return `${artifact.result.title} · ${locales.ai_table_rows.replace('{n}', String(artifact.result.rows.length))}`;
      case 'report':
        return artifact.report.title || locales.ai_canvas_tab_report;
      case 'proposal':
        return locales.ai_canvas_proposal.replace(
          '{changes}',
          changeCount(changesets[artifact.changesetId]?.ops.length ?? 0)
        );
      case 'board':
        return boards?.find((board) => board.id === artifact.boardId)?.name ?? locales.ai_canvas_tab_board;
    }
  };

  const body = (artifact: CanvasArtifact): JSX.Element | null => {
    switch (artifact.kind) {
      case 'result':
        return <ResultGrid key={artifact.id} result={artifact.result} />;
      case 'report':
        return <ReportEditor report={artifact.report} />;
      case 'proposal':
        return <ProposalView changesetId={artifact.changesetId} />;
      case 'board': {
        const board = boards?.find((item) => item.id === artifact.boardId);
        return board ? <BoardView board={board} /> : null;
      }
    }
  };

  return (
    <WorkspaceCanvasStyled data-testid='ai-changeset-surface' data-tab={active?.kind}>
      <WorkspaceCanvasHeaderStyled>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SidebarSectionTabs
            value={active?.id ?? ''}
            onChange={activate}
            aria-label={locales.ai_canvas_tabs}
            tabs={artifacts.map((artifact) => ({
              id: artifact.id,
              label: label(artifact),
              icon: ICONS[artifact.kind],
              onClose: () => close(artifact.id),
              data: { testid: 'ai-canvas-tab', kind: artifact.kind }
            }))}
          />
        </Box>
        <Tooltip title={fullScreen ? locales.ai_canvas_exit_full_screen : locales.ai_canvas_full_screen}>
          <IconButton onClick={onToggleFullScreen} data-testid='ai-canvas-fullscreen'>
            <CustomIcon type={fullScreen ? 'collapse' : 'expand'} size='xs' />
          </IconButton>
        </Tooltip>
        <Tooltip title={locales.ai_changes_close}>
          <IconButton onClick={onClose} data-testid='ai-changes-close'>
            <CustomIcon type='close' size='xs' />
          </IconButton>
        </Tooltip>
      </WorkspaceCanvasHeaderStyled>
      <WorkspaceCanvasBodyStyled sx={active?.kind === 'proposal' ? undefined : { overflow: 'hidden' }}>
        {active && body(active)}
      </WorkspaceCanvasBodyStyled>
    </WorkspaceCanvasStyled>
  );
}
