import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Box, CircularProgress, IconButton, Stack } from '@mui/material';
import { useAiChat } from '../hooks/useAiChat';
import { ChatBoxStyled } from './ChatBox.styled';
import ChatContext from './ChatContext/ChatContext';
import ChatTextInput from './ChatTextInput/ChatTextInput';
import Providers from './Providers/Providers';

export default function ChatBox() {
  const { autocomplete, currentChat, chatPending, handleSend } = useAiChat();

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
          <Box pr={1}>
            <CircularProgress size={13} />
          </Box>
        ) : (
          <IconButton onClick={() => void handleSend()}>
            <CustomIcon type='arrowUp' />
          </IconButton>
        )}
      </Stack>
    </ChatBoxStyled>
  );
}
