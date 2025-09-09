import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Box, CircularProgress, IconButton, Stack } from '@mui/material';
import type { ChatBoxProps } from '../types';
import { ChatBoxStyled } from './ChatBox.styled';
import ChatContext from './ChatContext/ChatContext';
import ChatTextInput from './ChatTextInput/ChatTextInput';
import Providers from './Providers/Providers';

export default function ChatBox({ autocomplete, loading, onSend }: ChatBoxProps) {
  return (
    <ChatBoxStyled>
      {autocomplete && <ChatContext autocomplete={autocomplete} />}
      <ChatTextInput loading={loading} onSend={onSend} />
      <Stack direction={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Providers />
        {loading ? (
          <Box pr={1}>
            <CircularProgress size={13} />
          </Box>
        ) : (
          <IconButton onClick={onSend}>
            <CustomIcon type='arrowUp' />
          </IconButton>
        )}
      </Stack>
    </ChatBoxStyled>
  );
}
