import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Stack } from '@mui/material';
import type { ChatBoxProps } from '../types';
import { ChatBoxStyled, SendButtonStyled } from './ChatBox.styled';
import ChatContext from './ChatContext/ChatContext';
import ChatTextInput from './ChatTextInput/ChatTextInput';
import Providers from './Providers/Providers';

export default function ChatBox({ autocomplete, loading, onSend, onCancel }: ChatBoxProps) {
  return (
    <ChatBoxStyled>
      {autocomplete && <ChatContext autocomplete={autocomplete} />}
      <ChatTextInput loading={loading} onSend={onSend} />
      <Stack
        direction={'row'}
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Providers />
        {loading ? (
          <SendButtonStyled onClick={onCancel}>
            <CustomIcon type='pause' />
          </SendButtonStyled>
        ) : (
          <SendButtonStyled onClick={onSend} variant='contained'>
            <CustomIcon type='arrowUp' />
          </SendButtonStyled>
        )}
      </Stack>
    </ChatBoxStyled>
  );
}
