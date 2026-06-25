import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { ChatBoxProps } from '../types';
import { ChatBoxStyled, ComposerFooterStyled, SendButtonStyled } from './ChatBox.styled';
import ChatContext from './ChatContext/ChatContext';
import ChatTextInput from './ChatTextInput/ChatTextInput';
import Providers from './Providers/Providers';

export default function ChatBox({ autocomplete, loading, onSend, onCancel }: ChatBoxProps) {
  return (
    <ChatBoxStyled>
      {autocomplete && <ChatContext autocomplete={autocomplete} />}
      <ChatTextInput loading={loading} onSend={onSend} autocomplete={autocomplete} />
      <ComposerFooterStyled>
        <Providers />
        {loading ? (
          <SendButtonStyled onClick={onCancel} variant='contained' color='primary'>
            <CustomIcon type='pause' size='xs' />
          </SendButtonStyled>
        ) : (
          <SendButtonStyled onClick={onSend} variant='contained' color='primary'>
            <CustomIcon type='arrowUp' size='xs' />
          </SendButtonStyled>
        )}
      </ComposerFooterStyled>
    </ChatBoxStyled>
  );
}
