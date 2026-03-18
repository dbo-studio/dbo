import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useAiStore } from '@/store/aiStore/ai.store';
import { IconButton, Stack } from '@mui/material';
import { useAiChat } from '../hooks/useAiChat';
import { ChatBoxStyled } from './ChatBox.styled';
import ChatContext from './ChatContext/ChatContext';
import ChatTextInput from './ChatTextInput/ChatTextInput';
import Providers from './Providers/Providers';

export default function ChatBox() {
  const currentChat = useAiStore((state) => state.currentChat);
  const { autocomplete, chatPending, handleSend, handleCancel } = useAiChat();

  if (!currentChat || !autocomplete) {
    return <></>;
  }

  return (
    <ChatBoxStyled>
      {autocomplete && <ChatContext autocomplete={autocomplete} />}
      <ChatTextInput loading={chatPending} onSend={() => void handleSend()} />
      <Stack direction={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Providers />
        {chatPending ? (
          <IconButton onClick={handleCancel}>
            <CustomIcon type='pause' />
          </IconButton>
        ) : (
          <IconButton onClick={() => void handleSend()}>
            <CustomIcon type='arrowUp' />
          </IconButton>
        )}
      </Stack>
    </ChatBoxStyled>
  );
}
