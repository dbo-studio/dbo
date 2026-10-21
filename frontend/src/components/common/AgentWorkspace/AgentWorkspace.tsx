import AddChat from '@/components/common/AiChatPanel/AddChat/AddChat';
import ChatBox from '@/components/common/AiChatPanel/ChatBox/ChatBox';
import ChatHistory from '@/components/common/AiChatPanel/ChatHistory/ChatHistory';
import { useAiChatController } from '@/components/common/AiChatPanel/hooks/useAiChatController';
import Messages from '@/components/common/AiChatPanel/Messages/Messages';
import { useChatActivity } from '@/components/common/AiChatPanel/hooks/useChatActivity';
import { useChangesetReview } from '@/hooks';
import locales from '@/locales';
import { shortcuts } from '@/core/utils/shortcuts';
import { useShortcut } from '@/hooks/useShortcut';
import { useAiStore } from '@/store/aiStore/ai.store';
import { isOpen, useChangesetStore } from '@/store/changesetStore/changeset.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Typography, useMediaQuery, useTheme } from '@mui/material';
import { type JSX, useCallback, useEffect, useRef, useState } from 'react';
import {
  AgentWorkspaceStyled,
  WorkspaceBodyStyled,
  FloatingPromptStyled,
  WorkspaceComposerStyled,
  WorkspaceConversationStyled,
  WorkspaceSessionsHeaderStyled,
  WorkspaceSessionsStyled,
  WorkspaceThreadStyled
} from './AgentWorkspace.styled';
import ChangesetDock from './ChangesetDock/ChangesetDock';
import WorkspaceCanvas, { type CanvasTab } from './WorkspaceCanvas/WorkspaceCanvas';
import WorkspaceTopBar from './WorkspaceTopBar/WorkspaceTopBar';

const OPEN_OVERLAY = '.MuiModal-root:not(.MuiModal-hidden)';

const CHAT_WIDTHS = { narrow: 600, default: 720, wide: 1000 } as const;

/**
 * Full-window agent surface over the main app (which stays mounted and inert
 * underneath). Drives the same chat controller as the side panel, so a chat
 * and a running turn carry over in both directions.
 */
export default function AgentWorkspace(): JSX.Element {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const [showSessions, setShowSessions] = useState(!isNarrow);
  const [showCanvas, setShowCanvas] = useState(true);
  const [canvasTab, setCanvasTab] = useState<CanvasTab>('diff');
  const [fullScreen, setFullScreen] = useState(false);
  const chatWidth = useSettingStore((state) => state.editor.aiChatWidth ?? 'default');
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
  // The newest proposal of this chat that still waits for the user, else its newest one.
  const openChangesetId = useChangesetStore(
    (state) =>
      Object.values(state.changesets)
        .filter((changeset) => changeset.chatId === currentChat?.id && changeset.ops.some((op) => isOpen(op.status)))
        .pop()?.id
  );
  const latestChangesetId = useChangesetStore(
    (state) =>
      Object.values(state.changesets)
        .filter((changeset) => changeset.chatId === currentChat?.id)
        .pop()?.id
  );
  const pending = useChangesetReview(openChangesetId ?? 0);
  const review = useChangesetReview(openChangesetId ?? latestChangesetId ?? 0);
  const activity = useChatActivity();
  const changesets = useChangesetStore((state) => state.changesets);
  const hasCanvasContent = !!review.changeset || !!activity.lastResult || activity.statements.length > 0;

  // The canvas follows the agent: a proposal opens Changes, a query result opens Data.
  const [seenItems, setSeenItems] = useState(activity.items.length);
  if (activity.items.length !== seenItems) {
    setSeenItems(activity.items.length);
    const last = activity.items.slice(seenItems).pop();
    if (last?.kind === 'diagram_diff') {
      // New tables are easiest to follow on the design; edits to existing ones on the diff.
      const creates = changesets[last.changesetId]?.ops.some((op) => op.op === 'create_table');
      setCanvasTab(creates ? 'diagram' : 'diff');
      setShowCanvas(true);
    } else if (last?.kind === 'tool' && last.trace.name === 'execute_sql' && last.trace.status === 'done') {
      setCanvasTab('data');
      setShowCanvas(true);
    }
  }
  const updateUI = useSettingStore((state) => state.updateUI);

  useShortcut(shortcuts.toggleWorkspaceSessions, () => setShowSessions((value) => !value));
  useShortcut(shortcuts.toggleWorkspaceChanges, () => setShowCanvas((value) => !value));
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
            setCanvasTab('diff');
            setShowCanvas(true);
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

  return (
    <AgentWorkspaceStyled ref={rootRef} aria-label={locales.ai_expand_to_agent} data-testid='ai-agent-workspace'>
      <WorkspaceTopBar onBack={close} onToggleSessions={() => setShowSessions((value) => !value)} />
      <WorkspaceBodyStyled>
        {showSessions && !fullScreen && (
          <WorkspaceSessionsStyled>
            <WorkspaceSessionsHeaderStyled>
              <Typography variant='subtitle2'>{locales.ai_workspace_sessions}</Typography>
              <AddChat onClick={() => void handleCreateChat()} />
            </WorkspaceSessionsHeaderStyled>
            <ChatHistory variant='list' />
          </WorkspaceSessionsStyled>
        )}
        {!fullScreen && (
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
        )}
        {hasCanvasContent && (showCanvas || fullScreen) && (
          <WorkspaceCanvas
            tab={canvasTab}
            onTabChange={setCanvasTab}
            review={review}
            activity={activity}
            fullScreen={fullScreen}
            onToggleFullScreen={() => setFullScreen((value) => !value)}
            onClose={() => {
              setFullScreen(false);
              setShowCanvas(false);
            }}
          />
        )}
        {/* Full screen: the conversation folds into a floating prompt bar over the canvas, like Cursor. */}
        {fullScreen && <FloatingPromptStyled data-testid='ai-floating-prompt'>{composer}</FloatingPromptStyled>}
      </WorkspaceBodyStyled>
    </AgentWorkspaceStyled>
  );
}
