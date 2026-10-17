import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { shortcuts } from '@/core/utils';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AddChat from './AddChat/AddChat';
import { AiChatPanelContainerStyled, ComposerContainerStyled, HeaderContainerStyled } from './AiChatPanel.styled';
import ChatBox from './ChatBox/ChatBox';
import ChatHistory from './ChatHistory/ChatHistory';
import Chats from './Chats/Chats';
import { useAiChatController } from './hooks/useAiChatController';
import Messages from './Messages/Messages';
import ModeBar from './ModeBar/ModeBar';

export default function AiChatPanel() {
  const {
    autocomplete,
    chatPending,
    handleCancel,
    handleChatChange,
    handleCreateChat,
    handleLoadMore,
    handleSend,
    handleRetry,
    handleRegenerate,
    handleCompare,
    handleFeedback,
    handleChatDelete,
    handleChatRename
  } = useAiChatController();

  const currentChat = useAiStore((state) => state.currentChat);
  const chats = useAiStore((state) => state.chats);
  const connectionId = useConnectionStore((state) => state.currentConnectionId);
  const updateUI = useSettingStore((state) => state.updateUI);
  const updateEditor = useSettingStore((state) => state.updateEditor);
  const density = useSettingStore((state) => state.editor.aiChatDensity ?? 'comfortable');
  const { useSidebarOverlay, isMobile } = useLayoutMode();

  return (
    <AiChatPanelContainerStyled>
      <HeaderContainerStyled>
        <Chats
          chats={chats ?? []}
          currentChat={currentChat}
          onChatChange={(chat) => void handleChatChange(chat)}
          onChatDelete={(chat) => void handleChatDelete(chat)}
          onChatRename={(chat, title) => void handleChatRename(chat, title)}
        />
        <AddChat onClick={() => void handleCreateChat()} />
        <ChatHistory />
        <Tooltip title={density === 'compact' ? locales.ai_density_compact : locales.ai_density_comfortable}>
          <IconButton
            onClick={() => updateEditor({ aiChatDensity: density === 'compact' ? 'comfortable' : 'compact' })}
            data-testid='ai-density-toggle'
            data-density={density}
          >
            <CustomIcon type='density' />
          </IconButton>
        </Tooltip>
        {connectionId && !useSidebarOverlay && (
          <Tooltip title={`${locales.ai_expand_to_agent} (${shortcuts.toggleAgentWorkspace.command.join('+')})`}>
            <IconButton onClick={() => updateUI({ agentWorkspaceOpen: true })} data-testid='ai-expand-to-agent'>
              <CustomIcon type='expand' />
            </IconButton>
          </Tooltip>
        )}
      </HeaderContainerStyled>
      {connectionId && !isMobile && <ModeBar />}
      {!connectionId ? (
        <Stack
          spacing={1.5}
          sx={{ flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2 }}
          data-testid='ai-no-connection'
        >
          <CustomIcon type='connection' size='m' />
          <Typography variant='subtitle2'>{locales.ai_no_connection_title}</Typography>
          <Typography variant='caption' color='textSubdued' sx={{ maxWidth: 260 }}>
            {locales.ai_no_connection_subtitle}
          </Typography>
          <Button size='small' variant='outlined' onClick={() => updateUI({ showConnectionsDrawer: true })}>
            {locales.ai_select_connection}
          </Button>
        </Stack>
      ) : (
        <Messages
          loading={chatPending}
          messages={currentChat?.messages ?? []}
          onLoadMore={() => void handleLoadMore()}
          onSelectPrompt={(prompt) => void handleSend(prompt)}
          onRetry={() => void handleRetry()}
          onRegenerate={() => void handleRegenerate()}
          onCompare={(providerId, model) => void handleCompare(providerId, model)}
          onFeedback={(rating) => void handleFeedback(rating)}
        />
      )}
      {connectionId && (
        <ComposerContainerStyled>
          {/* Phones: the mode switch sits right above the input it affects, not under the header. */}
          {isMobile && <ModeBar />}
          <ChatBox
            loading={chatPending}
            autocomplete={autocomplete}
            onSend={() => void handleSend()}
            onCancel={() => void handleCancel()}
          />
        </ComposerContainerStyled>
      )}
    </AiChatPanelContainerStyled>
  );
}
