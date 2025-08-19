import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { AiChatType } from '@/types';
import { IconButton } from '@mui/material';
import { useMutation } from '@tanstack/react-query';

export default function AddChat() {
  const addChat = useAiStore((state) => state.addChat);
  const updateCurrentChat = useAiStore((state) => state.updateCurrentChat);

  const { mutateAsync: createChatMutation } = useMutation({
    mutationFn: api.aiChat.createChat,
    onSuccess: (data: AiChatType): void => {
      addChat(data);
      updateCurrentChat(data);
    },
    onError: (error: Error): void => {
      console.error('🚀 ~ createChatMutation ~ error:', error);
    }
  });

  const handleCreateChat = async (): Promise<void> => {
    await createChatMutation({
      title: locales.new_chat
    });
  };

  return (
    <IconButton size='small' onClick={handleCreateChat}>
      <CustomIcon type='plus' />
    </IconButton>
  );
}
