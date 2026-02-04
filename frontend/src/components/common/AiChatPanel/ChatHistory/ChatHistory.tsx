import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import DropDownMenu from '@/components/base/DropDownMenu/DropDownMenu';
import { tools } from '@/core/utils';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { AiChatType } from '@/types';
import { Box, IconButton } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { ChatHistoryStyled } from './ChatHistory.styled';
import ChatHistoryItem from './ChatHistoryItem/ChatHistoryItem';

export default function ChatHistory() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const queryClient = useQueryClient();
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);
  const chats = useAiStore((state) => state.chats);
  const currentChat = useAiStore((state) => state.currentChat);
  const updateCurrentChat = useAiStore((state) => state.updateCurrentChat);
  const addChat = useAiStore((state) => state.addChat);
  const updateChats = useAiStore((state) => state.updateChats);

  const { data } = useQuery({
    queryKey: ['aiChatHistory', currentConnectionId],
    queryFn: () =>
      api.aiChat.getChats({
        connectionId: currentConnectionId ?? 0,
        page: 1,
        count: 50
      }),
    enabled: !!currentConnectionId && open
  });

  const { mutateAsync: deleteChatMutation } = useMutation({
    mutationFn: api.aiChat.deleteChat,
    onSuccess: (): void => {
      queryClient.invalidateQueries({
        queryKey: ['aiChatHistory', currentConnectionId]
      });
    }
  });

  const handleSelectChat = useCallback(
    async (item: AiChatType) => {
      if (item.id === currentChat?.id) return;

      const foundChat = chats.find((c) => c.id === item.id);
      if (!foundChat) {
        await addChat(item);
      }

      try {
        const detail = await api.aiChat.getChatDetail({
          id: item.id,
          page: 1,
          count: 10
        });
        updateCurrentChat(detail);
      } catch (err) {
        console.debug('🚀 ~ ChatHistory ~ err:', err);
      }
    },
    [chats]
  );

  const handleDelete = useCallback(
    async (chat: AiChatType) => {
      try {
        await deleteChatMutation(chat.id);

        const newChats = chats.filter((c) => c.id !== chat.id);
        updateChats(newChats);
        if (currentChat?.id === chat.id) {
          if (newChats.length > 0) {
            handleSelectChat(newChats[newChats.length - 1]);
          } else {
            updateCurrentChat(undefined);
          }
        }

        if (data?.length === 1) {
          setOpen(false);
        }
      } catch (err) {
        console.debug('🚀 ~ ChatHistory ~ err:', err);
      }
    },
    [chats, data]
  );

  return (
    <Box>
      <IconButton ref={anchorRef} onClick={() => setOpen(true)}>
        <CustomIcon type='history' />
      </IconButton>

      <DropDownMenu open={open} onClose={() => setOpen(false)} anchorRef={anchorRef}>
        <ChatHistoryStyled>
          {data?.map((item) => (
            <ChatHistoryItem
              key={tools.uuid()}
              item={item}
              onClick={() => handleSelectChat(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </ChatHistoryStyled>
      </DropDownMenu>
    </Box>
  );
}
