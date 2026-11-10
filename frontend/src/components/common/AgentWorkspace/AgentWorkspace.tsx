import AddChat from '@/components/common/AiChatPanel/AddChat/AddChat';
import ChatBox from '@/components/common/AiChatPanel/ChatBox/ChatBox';
import ChatHistory from '@/components/common/AiChatPanel/ChatHistory/ChatHistory';
import { useAiChatController } from '@/components/common/AiChatPanel/hooks/useAiChatController';
import Messages from '@/components/common/AiChatPanel/Messages/Messages';
import { useChatActivity } from '@/components/common/AiChatPanel/hooks/useChatActivity';
import { reportFromTrace } from '@/components/common/AiChatPanel/utils/chartReport';
import { resultFromTrace } from '@/components/common/AiChatPanel/utils/queryResult';
import { useChangesetReview } from '@/hooks';
import locales from '@/locales';
import { shortcuts } from '@/core/utils/shortcuts';
import { useShortcut } from '@/hooks/useShortcut';
import { useAiStore } from '@/store/aiStore/ai.store';
import { isOpen, useChangesetStore } from '@/store/changesetStore/changeset.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import ResizableXBox from '@/components/base/ResizableBox/ResizableXBox';
import { Collapse, Typography, useMediaQuery, useTheme } from '@mui/material';
import { type JSX, useCallback, useEffect, useRef, useState } from 'react';
import {
  AgentWorkspaceStyled,
  WorkspaceBodyStyled,
  WorkspaceComposerStyled,
  WorkspaceConversationStyled,
  WorkspaceSessionsHeaderStyled,
  WorkspaceSessionsStyled,
  WorkspaceThreadStyled
} from './AgentWorkspace.styled';
import ChangesetDock from './ChangesetDock/ChangesetDock';
import SavedReports from './SavedReports/SavedReports';
import WorkspaceCanvas from './WorkspaceCanvas/WorkspaceCanvas';
import { useWorkspaceCanvas } from './workspaceCanvas.store';
import WorkspaceTopBar from './WorkspaceTopBar/WorkspaceTopBar';

const OPEN_OVERLAY = '.MuiModal-root:not(.MuiModal-hidden)';

const CHAT_WIDTHS = { narrow: 600, default: 720, wide: 1000 } as const;
const EXPANDED_CHAT_WIDTH = 380;

/**
 * Full-window agent surface over the main app (which stays mounted and inert
 * underneath). Drives the same chat controller as the side panel, so a chat
 * and a running turn carry over in both directions.
 */
export default function AgentWorkspace(): JSX.Element {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const [showSessions, setShowSessions] = useState(!isNarrow);
  const showCanvas = useWorkspaceCanvas((state) => state.visible);
  const artifactCount = useWorkspaceCanvas((state) => state.artifacts.length);
  const [fullScreen, setFullScreen] = useState(false);
  const chatWidth = useSettingStore((state) => state.editor.aiChatWidth ?? 'default');
  const sessionsWidth = useSettingStore((state) => state.editor.aiSessionsWidth ?? 260);
  const canvasWidth = useSettingStore((state) => state.editor.aiCanvasWidth ?? 520);
  const updateEditor = useSettingStore((state) => state.updateEditor);
  const rootRef = useRef<HTMLElement>(null);

  const {
    autocomplete,
    chatPending,
    handleCancel,
    handleCreateChat,
    handleLoadMore,
    handleSend,
    handleRetry,
    handleRegenerate
  } = useAiChatController();
  const currentChat = useAiStore((state) => state.currentChat);
  // The newest proposal of this chat that still waits for the user.
  const openChangesetId = useChangesetStore(
    (state) =>
      Object.values(state.changesets)
        .filter((changeset) => changeset.chatId === currentChat?.id && changeset.ops.some((op) => isOpen(op.status)))
        .pop()?.id
  );
  const pending = useChangesetReview(openChangesetId ?? 0);
  const activity = useChatActivity();

  // The canvas follows the agent: each finished query, chart or proposal opens as a tab. A step first shows as
  // running and turns done in place, so follow the newest finished one by its id, not by the item count.
  const focus = [...activity.items]
    .reverse()
    .find(
      (item) =>
        item.kind === 'diagram_diff' ||
        (item.kind === 'tool' &&
          item.trace.status === 'done' &&
          (item.trace.name === 'execute_sql' || item.trace.name === 'show_chart'))
    );
  const focusKey =
    focus?.kind === 'diagram_diff' ? `changeset-${focus.changesetId}` : focus?.kind === 'tool' ? focus.trace.id : '';
  const focusRef = useRef(focus);
  focusRef.current = focus;

  // Another chat starts with its own tabs: its newest artifact.
  useEffect(() => {
    useWorkspaceCanvas.getState().reset();
  }, [currentChat?.id]);

  useEffect(() => {
    const item = focusRef.current;
    const canvas = useWorkspaceCanvas.getState();
    if (item?.kind === 'diagram_diff') {
      // New tables are easiest to follow on the design; edits to existing ones on the diff.
      const creates = useChangesetStore
        .getState()
        .changesets[item.changesetId]?.ops.some((op) => op.op === 'create_table');
      canvas.openProposal(item.changesetId, creates ? 'design' : 'diff');
    } else if (item?.kind === 'tool' && item.trace.name === 'execute_sql') {
      const result = resultFromTrace(item.trace);
      if (result && result.rows.length > 0) canvas.open({ id: `result-${result.id}`, kind: 'result', result });
    } else if (item?.kind === 'tool' && item.trace.name === 'show_chart') {
      const report = reportFromTrace(item.trace);
      if (report) canvas.showReport(report);
    }
  }, [focusKey, currentChat?.id]);

  const updateUI = useSettingStore((state) => state.updateUI);

  useShortcut(shortcuts.toggleWorkspaceSessions, () => setShowSessions((value) => !value));
  useShortcut(shortcuts.toggleWorkspaceChanges, () =>
    useWorkspaceCanvas.getState().setVisible(!useWorkspaceCanvas.getState().visible)
  );
  useShortcut(shortcuts.toggleWorkspaceFullScreen, () => setFullScreen((value) => !value));

  const close = useCallback(() => updateUI({ agentWorkspaceOpen: false }), [updateUI]);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    rootRef.current?.querySelector<HTMLTextAreaElement>('[data-testid="ai-chat-input"]')?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  // Esc closes the innermost thing: an open dialog or menu (it handles itself),
  // then a running turn, then the workspace. The composer marks Esc handled
  // when it stops a turn or blurs itself.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector(OPEN_OVERLAY)) return;

      event.preventDefault();
      const { sessions, currentChat: openChat } = useAiStore.getState();
      if (sessions[openChat?.id ?? 0]?.streaming.status === 'streaming') {
        handleCancel();
        return;
      }
      if (fullScreen) {
        setFullScreen(false);
        return;
      }
      close();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close, handleCancel, fullScreen]);

  const composer = (
    <>
      {pending.openCount > 0 && (
        <ChangesetDock
          review={pending}
          onReview={() => {
            if (openChangesetId) useWorkspaceCanvas.getState().openProposal(openChangesetId, 'diff');
          }}
        />
      )}
      <ChatBox
        loading={chatPending}
        autocomplete={autocomplete}
        onSend={(prompt) => void handleSend(prompt)}
        onCancel={() => void handleCancel()}
      />
    </>
  );

  const canvasOpen = artifactCount > 0 && (showCanvas || fullScreen);
  const canvas = (
    <WorkspaceCanvas
      fullScreen={fullScreen}
      onToggleFullScreen={() => setFullScreen((value) => !value)}
      onClose={() => {
        setFullScreen(false);
        useWorkspaceCanvas.getState().setVisible(false);
      }}
    />
  );

  return (
    <AgentWorkspaceStyled ref={rootRef} aria-label={locales.ai_expand_to_agent} data-testid='ai-agent-workspace'>
      <WorkspaceTopBar onBack={close} onToggleSessions={() => setShowSessions((value) => !value)} />
      <WorkspaceBodyStyled>
        {/* Panels slide in and out instead of popping: the session list, and the canvas beside the chat. */}
        <Collapse orientation='horizontal' in={showSessions && !fullScreen} sx={{ flexShrink: 0 }}>
          <ResizableXBox
            direction='rtl'
            width={sessionsWidth}
            maxWidth={480}
            sx={{ height: '100%' }}
            onChange={(width) => updateEditor({ aiSessionsWidth: Math.max(180, width) })}
          >
            <WorkspaceSessionsStyled>
              <WorkspaceSessionsHeaderStyled>
                <Typography variant='subtitle2'>{locales.ai_workspace_sessions}</Typography>
                <AddChat onClick={() => void handleCreateChat()} />
              </WorkspaceSessionsHeaderStyled>
              <ChatHistory variant='list' />
              <SavedReports />
            </WorkspaceSessionsStyled>
          </ResizableXBox>
        </Collapse>
        <WorkspaceConversationStyled>
          <WorkspaceThreadStyled sx={{ maxWidth: CHAT_WIDTHS[chatWidth] }}>
            <Messages
              loading={chatPending}
              messages={currentChat?.messages ?? []}
              onLoadMore={() => void handleLoadMore()}
              onSelectPrompt={(prompt) => void handleSend(prompt)}
              onRetry={() => void handleRetry()}
              onRegenerate={() => void handleRegenerate()}
            />
            <WorkspaceComposerStyled>{composer}</WorkspaceComposerStyled>
          </WorkspaceThreadStyled>
        </WorkspaceConversationStyled>
        {isNarrow ? (
          canvasOpen && canvas
        ) : (
          <Collapse orientation='horizontal' in={canvasOpen} unmountOnExit sx={{ flexShrink: 0 }}>
            {/* Expanded, the canvas takes all but a narrow chat column; the width eases between the two. */}
            <ResizableXBox
              direction='ltr'
              width={canvasWidth}
              maxWidth={1400}
              widthOverride={fullScreen ? `calc(100vw - ${EXPANDED_CHAT_WIDTH}px)` : undefined}
              sx={{ height: '100%' }}
              onChange={(width) => updateEditor({ aiCanvasWidth: Math.max(320, width) })}
            >
              {canvas}
            </ResizableXBox>
          </Collapse>
        )}
      </WorkspaceBodyStyled>
    </AgentWorkspaceStyled>
  );
}
