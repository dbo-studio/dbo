import AddChat from '@/components/common/AiChatPanel/AddChat/AddChat';
import ChatBox from '@/components/common/AiChatPanel/ChatBox/ChatBox';
import ChatHistory from '@/components/common/AiChatPanel/ChatHistory/ChatHistory';
import { useAiChatController } from '@/components/common/AiChatPanel/hooks/useAiChatController';
import Messages from '@/components/common/AiChatPanel/Messages/Messages';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Typography, useMediaQuery, useTheme } from '@mui/material';
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
import WorkspaceTopBar from './WorkspaceTopBar/WorkspaceTopBar';

const OPEN_OVERLAY = '.MuiModal-root:not(.MuiModal-hidden)';

/**
 * Full-window agent surface over the main app (which stays mounted and inert
 * underneath). Drives the same chat controller as the side panel, so a chat
 * and a running turn carry over in both directions.
 */
export default function AgentWorkspace(): JSX.Element {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const [showSessions, setShowSessions] = useState(!isNarrow);
  const rootRef = useRef<HTMLDivElement>(null);

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
  const updateUI = useSettingStore((state) => state.updateUI);

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
      if (useAiStore.getState().streaming.status === 'streaming') {
        handleCancel();
        return;
      }
      close();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close, handleCancel]);

  return (
    <AgentWorkspaceStyled
      ref={rootRef}
      component='section'
      aria-label={locales.ai_expand_to_agent}
      data-testid='ai-agent-workspace'
    >
      <WorkspaceTopBar onBack={close} onToggleSessions={() => setShowSessions((value) => !value)} />
      <WorkspaceBodyStyled>
        {showSessions && (
          <WorkspaceSessionsStyled>
            <WorkspaceSessionsHeaderStyled>
              <Typography variant='subtitle2'>{locales.ai_workspace_sessions}</Typography>
              <AddChat onClick={() => void handleCreateChat()} />
            </WorkspaceSessionsHeaderStyled>
            <ChatHistory variant='list' />
          </WorkspaceSessionsStyled>
        )}
        <WorkspaceConversationStyled>
          <WorkspaceThreadStyled>
            <Messages
              loading={chatPending}
              messages={currentChat?.messages ?? []}
              onLoadMore={() => void handleLoadMore()}
              onSelectPrompt={(prompt) => void handleSend(prompt)}
              onRetry={() => void handleRetry()}
              onRegenerate={() => void handleRegenerate()}
            />
            <WorkspaceComposerStyled>
              <ChatBox
                loading={chatPending}
                autocomplete={autocomplete}
                onSend={() => void handleSend()}
                onCancel={() => void handleCancel()}
              />
            </WorkspaceComposerStyled>
          </WorkspaceThreadStyled>
        </WorkspaceConversationStyled>
      </WorkspaceBodyStyled>
    </AgentWorkspaceStyled>
  );
}
