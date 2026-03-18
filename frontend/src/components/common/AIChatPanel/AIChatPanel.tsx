import { Box, Stack } from '@mui/material';
import AddChat from './AddChat/AddChat';
import { HeaderContainerStyled } from './AiChatPanel.styled';
import ChatBox from './ChatBox/ChatBox';
import ChatHistory from './ChatHistory/ChatHistory';
import Chats from './Chats/Chats';
import Messages from './Messages/Messages';

export default function AiChatPanel() {
  return (
    <Box height={'100%'} minHeight={0} position={'relative'} display={'flex'} flexDirection={'column'}>
      <HeaderContainerStyled>
        <Chats />
        <Stack direction={'row'} alignItems={'center'}>
          <AddChat />
          <ChatHistory />
        </Stack>
      </HeaderContainerStyled>
      <Messages />
      <Box>
        <ChatBox />
      </Box>
    </Box>
  );
}
