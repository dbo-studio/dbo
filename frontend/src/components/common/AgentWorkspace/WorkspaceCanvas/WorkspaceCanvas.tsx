import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import api from '@/api';
import ChatDataTable from '@/components/common/AiChatPanel/Messages/ChatDataTable/ChatDataTable';
import type { ChatActivity } from '@/components/common/AiChatPanel/hooks/useChatActivity';
import type { ChartReport } from '@/components/common/AiChatPanel/utils/chartReport';
import type { useChangesetReview } from '@/hooks';
import locales from '@/locales';
import { IconButton, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import MiniDiagram from '../MiniDiagram/MiniDiagram';
import ReportEditor from '../ReportEditor/ReportEditor';
import { useWorkspaceCanvas, type CanvasTab } from '../workspaceCanvas.store';
import BoardView from '../BoardView/BoardView';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import SchemaDiff from '../SchemaDiff/SchemaDiff';
import SqlPreview from '../SqlPreview/SqlPreview';
import {
  WorkspaceCanvasBodyStyled,
  WorkspaceCanvasEmptyStyled,
  WorkspaceCanvasHeaderStyled,
  WorkspaceCanvasStyled
} from './WorkspaceCanvas.styled';

type WorkspaceCanvasProps = {
  tab: CanvasTab;
  onTabChange: (tab: CanvasTab) => void;
  review: ReturnType<typeof useChangesetReview>;
  activity: ChatActivity;
  /** The report on the Report tab: one the user opened, else the agent's newest chart. */
  report?: ChartReport;
  fullScreen: boolean;
  onToggleFullScreen: () => void;
  onClose: () => void;
};

function Empty({ text }: { text: string }): JSX.Element {
  return (
    <WorkspaceCanvasEmptyStyled>
      <Typography variant='body2'>{text}</Typography>
    </WorkspaceCanvasEmptyStyled>
  );
}

/**
 * The workstation's right-hand canvas, like Cursor's agent panel: the agent's
 * work shown large. Diagram and Changes show the proposal, Data the newest query
 * result, SQL every statement. The tab follows what the agent did last.
 */
export default function WorkspaceCanvas({
  tab,
  onTabChange,
  review,
  activity,
  report,
  fullScreen,
  onToggleFullScreen,
  onClose
}: WorkspaceCanvasProps): JSX.Element {
  const { changeset } = review;
  const connectionId = Number(useConnectionStore((state) => state.currentConnectionId));
  const boardId = useWorkspaceCanvas((state) => state.boardId);
  const { data: boards } = useQuery({
    queryKey: ['dashboards', connectionId],
    queryFn: () => api.dashboard.getDashboards(connectionId),
    // Lists change behind this screen (the agent saves and pins), so a stale one reloads on open.
    refetchOnMount: true,
    enabled: !!connectionId
  });
  const board = boards?.find((item) => item.id === boardId);
  const chatId = changeset?.chatId;
  const id = changeset?.id;
  const { data: before } = useQuery({
    queryKey: ['ai-changeset-before', chatId, id],
    queryFn: () => api.aiChat.getChangesetBefore({ chatId: chatId as number, id: id as number }),
    enabled: !!changeset
  });

  const body = (): JSX.Element => {
    switch (tab) {
      case 'diagram':
        return changeset ? <MiniDiagram changeset={changeset} /> : <Empty text={locales.ai_canvas_no_changes} />;
      case 'diff':
        return changeset ? (
          <SchemaDiff
            changeset={changeset}
            before={before}
            onReview={(status, position) => void review.review(status, position)}
            onEdit={(position, op) => void review.edit(position, op)}
          />
        ) : (
          <Empty text={locales.ai_canvas_no_changes} />
        );
      case 'data':
        return activity.lastResult ? (
          <ChatDataTable
            rows={activity.lastResult.rows}
            columns={activity.lastResult.columns}
            query={activity.lastResult.sql}
            tall
          />
        ) : (
          <Empty text={locales.ai_canvas_no_data} />
        );
      case 'report':
        return report ? <ReportEditor report={report} /> : <Empty text={locales.ai_canvas_no_report} />;
      case 'board':
        return board ? <BoardView board={board} /> : <Empty text={locales.ai_canvas_no_board} />;
      case 'sql':
        return (
          <Stack spacing={1.5}>
            {changeset && <SqlPreview changeset={changeset} />}
            {activity.statements.length > 0 && (
              <Stack spacing={1} data-testid='ai-canvas-statements'>
                <Typography variant='caption' color='textSubdued'>
                  {locales.ai_canvas_statements}
                </Typography>
                {activity.statements.map((statement) => (
                  <SyntaxHighlighter key={statement.id} value={statement.sql} />
                ))}
              </Stack>
            )}
            {!changeset && activity.statements.length === 0 && <Empty text={locales.ai_canvas_no_sql} />}
          </Stack>
        );
    }
  };

  return (
    <WorkspaceCanvasStyled fullScreen={fullScreen} data-testid='ai-changeset-surface' data-tab={tab}>
      <WorkspaceCanvasHeaderStyled>
        <Tabs
          value={tab}
          onChange={(_, value: CanvasTab) => onTabChange(value)}
          variant='scrollable'
          scrollButtons={false}
          sx={{ minHeight: 0, flex: 1 }}
        >
          <Tab value='diagram' label={locales.ai_changes_tab_diagram} data-testid='ai-changes-tab-diagram' />
          <Tab value='diff' label={locales.ai_changes_tab_diff} data-testid='ai-changes-tab-diff' />
          <Tab value='data' label={locales.ai_canvas_tab_data} data-testid='ai-canvas-tab-data' />
          <Tab value='report' label={locales.ai_canvas_tab_report} data-testid='ai-canvas-tab-report' />
          <Tab value='board' label={locales.ai_canvas_tab_board} data-testid='ai-canvas-tab-board' />
          <Tab value='sql' label={locales.ai_changes_tab_sql} data-testid='ai-changes-tab-sql' />
        </Tabs>
        <Tooltip title={fullScreen ? locales.ai_canvas_exit_full_screen : locales.ai_canvas_full_screen}>
          <IconButton size='small' onClick={onToggleFullScreen} data-testid='ai-canvas-fullscreen'>
            <CustomIcon type={fullScreen ? 'collapse' : 'expand'} size='xs' />
          </IconButton>
        </Tooltip>
        <Tooltip title={locales.ai_changes_close}>
          <IconButton size='small' onClick={onClose} data-testid='ai-changes-close'>
            <CustomIcon type='close' size='xs' />
          </IconButton>
        </Tooltip>
      </WorkspaceCanvasHeaderStyled>
      <WorkspaceCanvasBodyStyled>{body()}</WorkspaceCanvasBodyStyled>
    </WorkspaceCanvasStyled>
  );
}
