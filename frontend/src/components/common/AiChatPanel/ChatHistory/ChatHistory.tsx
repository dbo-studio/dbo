import api from '@/api';
import BottomSheet from '@/components/base/BottomSheet/BottomSheet';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import DropDownMenu from '@/components/base/DropDownMenu/DropDownMenu';
import { useLayoutMode } from '@/hooks/useLayoutMode';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { AiChatType } from '@/types';
import { Box, IconButton, InputBase, Tooltip, Typography } from '@mui/material';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useCallback, useEffect, useRef, useState } from 'react';
import { ChatHistoryGroupStyled, ChatHistoryListStyled, ChatHistoryStyled } from './ChatHistory.styled';
import ChatHistoryItem from './ChatHistoryItem/ChatHistoryItem';
import locales from '@/locales';
import { tools } from '@/core/utils/tools';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { chatFileName, chatToMarkdown } from '../utils/chatExport';
import type { ChatHistoryProps } from './types';

export default function ChatHistory({ variant = 'menu' }: ChatHistoryProps): JSX.Element {
  const { isMobile } = useLayoutMode();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const confirmDanger = useConfirmModalStore((state) => state.danger);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const queryClient = useQueryClient();
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);
  const chats = useAiStore((state) => state.chats);
  const currentChat = useAiStore((state) => state.currentChat);
  const updateCurrentChat = useAiStore((state) => state.updateCurrentChat);
  const addChat = useAiStore((state) => state.addChat);
  const updateChats = useAiStore((state) => state.updateChats);

  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const { data } = useQuery({
    queryKey: ['aiChatHistory', currentConnectionId, searchTerm],
    placeholderData: keepPreviousData,
    queryFn: () =>
      api.aiChat.getChats({
        connectionId: currentConnectionId ?? 0,
        search: searchTerm || undefined,
        page: 1,
        count: 50
      }),
    enabled: !!currentConnectionId && (open || variant === 'list')
  });

  // The list stays mounted, so refresh it when a chat is created, switched or renamed.
  const currentChatKey = `${currentChat?.id ?? ''}:${currentChat?.title ?? ''}`;
  useEffect(() => {
    if (variant !== 'list' || !currentConnectionId) return;
    void queryClient.invalidateQueries({ queryKey: ['aiChatHistory', currentConnectionId] });
  }, [variant, currentChatKey, currentConnectionId, queryClient]);

  const { mutateAsync: deleteChatMutation } = useMutation({
    mutationFn: api.aiChat.deleteChat
  });

  const handleSelectChat = useCallback(
    async (item: AiChatType) => {
      if (item.id === currentChat?.id) return;

      const foundChat = chats.find((c) => c.id === item.id);
      if (!foundChat) {
        addChat(item);
      }

      try {
        const detail = await api.aiChat.getChatDetail({
          id: item.id,
          page: 1,
          count: 10
        });
        updateCurrentChat(detail);
      } catch {
        /* ignored */
      }
    },
    [addChat, chats, currentChat?.id, updateCurrentChat]
  );

  const deleteChat = useCallback(
    async (chat: AiChatType) => {
      try {
        await deleteChatMutation(chat.id);
        await queryClient.invalidateQueries({
          queryKey: ['aiChatHistory', currentConnectionId]
        });

        const newChats = chats.filter((c) => c.id !== chat.id);
        updateChats(newChats);
        if (currentChat?.id === chat.id) {
          if (newChats.length > 0) {
            await handleSelectChat(newChats[newChats.length - 1]);
          } else {
            updateCurrentChat(undefined);
          }
        }

        if (data?.length === 1) {
          setOpen(false);
        }
      } catch {
        /* ignored */
      }
    },
    [
      chats,
      currentChat?.id,
      currentConnectionId,
      data?.length,
      deleteChatMutation,
      handleSelectChat,
      queryClient,
      updateChats,
      updateCurrentChat
    ]
  );

  const handleDelete = useCallback(
    (chat: AiChatType): void => {
      confirmDanger(locales.ai_history_delete, locales.ai_history_delete_confirm, () => void deleteChat(chat));
    },
    [confirmDanger, deleteChat]
  );

  const handleTogglePin = useCallback(
    async (chat: AiChatType) => {
      try {
        await api.aiChat.updateChat(chat.id, { pinned: !chat.pinned });
        await queryClient.invalidateQueries({ queryKey: ['aiChatHistory', currentConnectionId] });
      } catch {
        /* ignored */
      }
    },
    [currentConnectionId, queryClient]
  );

  const handleExport = useCallback(async (chat: AiChatType) => {
    try {
      const messages: AiChatType['messages'] = [];
      const count = 100;
      for (let page = 1; ; page++) {
        const detail = await api.aiChat.getChatDetail({ id: chat.id, page, count });
        messages.unshift(...detail.messages);
        if (detail.messages.length < count) break;
      }
      const full = { ...chat, messages };
      tools.fileDownload(new Blob([chatToMarkdown(full)], { type: 'text/markdown' }), chatFileName(full));
    } catch {
      /* ignored */
    }
  }, []);

  const visible = data ?? [];

  const items = visible.map((item) => (
    <ChatHistoryItem
      key={item.id}
      item={item}
      selected={variant === 'list' && item.id === currentChat?.id}
      onClick={() => void handleSelectChat(item)}
      onDelete={() => handleDelete(item)}
      onTogglePin={() => void handleTogglePin(item)}
      onExport={() => void handleExport(item)}
    />
  ));

  const content = (
    <>
      <InputBase
        // Phones open a bottom sheet; focusing straight away would raise the keyboard over it.
        autoFocus={variant === 'menu' && !isMobile}
        fullWidth
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={locales.ai_history_search}
        inputProps={{ 'aria-label': locales.ai_history_search, 'data-testid': 'ai-history-search' }}
        sx={{
          fontSize: '0.75rem',
          px: 1,
          mb: 0.5,
          height: 32,
          ...(isMobile ? { mb: 1 } : { borderBottom: 1, borderColor: 'divider' })
        }}
      />
      {visible.length === 0 && (
        <Typography variant='caption' color='textSubdued' sx={{ p: 1 }} data-testid='ai-history-empty'>
          {data?.length ? locales.ai_history_no_results : locales.ai_history_empty}
        </Typography>
      )}
      {isMobile && visible.length > 0 ? <ChatHistoryGroupStyled>{items}</ChatHistoryGroupStyled> : items}
    </>
  );

  if (variant === 'list') {
    return <ChatHistoryListStyled data-testid='ai-workspace-sessions'>{content}</ChatHistoryListStyled>;
  }

  return (
    <Box>
      <Tooltip title={locales.chat_history}>
        <IconButton ref={anchorRef} onClick={() => setOpen(true)}>
          <CustomIcon type='history' />
        </IconButton>
      </Tooltip>

      {isMobile ? (
        <BottomSheet open={open} onClose={() => setOpen(false)} title={locales.chat_history}>
          {content}
        </BottomSheet>
      ) : (
        <DropDownMenu open={open} onClose={() => setOpen(false)} anchorRef={anchorRef}>
          <ChatHistoryStyled>{content}</ChatHistoryStyled>
        </DropDownMenu>
      )}
    </Box>
  );
}
