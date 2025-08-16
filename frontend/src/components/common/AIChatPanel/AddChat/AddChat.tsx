import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import type { AIChat } from '@/types/AiChat';
import { IconButton } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AddChatProps } from '../types';

export default function AddChat({ onChatAdd }: AddChatProps) {
  const queryClient = useQueryClient();

  const { mutateAsync: createChatMutation } = useMutation({
    mutationFn: api.aiChat.createChat,
    onSuccess: (data: AIChat): void => {
      queryClient.setQueryData(['aiChats'], (old: AIChat[] | undefined) => [...(old || []), data]);
      onChatAdd(data);
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
