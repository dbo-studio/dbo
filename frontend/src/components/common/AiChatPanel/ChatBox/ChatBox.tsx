import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { IconButton, Stack } from '@mui/material';
import type { ChatBoxProps } from '../types';
import { ChatBoxStyled } from './ChatBox.styled';
import ChatContext from './ChatContext/ChatContext';
import ChatTextInput from './ChatTextInput/ChatTextInput';
import Providers from './Providers/Providers';

export default function ChatBox({ autocomplete, loading, onSend, onCancel }: ChatBoxProps) {
  return (
    <ChatBoxStyled>
      {autocomplete && <ChatContext autocomplete={autocomplete} />}
      <ChatTextInput loading={loading} onSend={onSend} />
      <Stack direction={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Providers />
        {loading ? (
          <IconButton onClick={onCancel}>
            <CustomIcon type='pause' />
          </IconButton>
        ) : (
          <IconButton onClick={onSend} sx={{ border: (theme) => `1px solid ${theme.palette.divider}` }}>
            <CustomIcon type='arrowUp' />
          </IconButton>
        )}
      </Stack>
    </ChatBoxStyled>
  );
}
