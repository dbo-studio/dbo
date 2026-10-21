import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { Tooltip } from '@mui/material';
import type { JSX } from 'react';
import type { ChatContextItemProps } from '../../../types';
import { ChatContextItemNameStyled } from '../ChatContext.styled';
import { ChatContextItemRemoveStyled, ChatContextItemStyled } from './ChatContextItem.styled';

export default function ChatContextItem({ name, type, onClick }: ChatContextItemProps): JSX.Element {
  return (
    <ChatContextItemStyled data-testid='ai-context-chip' data-chip={name}>
      <CustomIcon type={type === 'database' ? 'database' : type === 'query' ? 'sql' : 'sheet'} size='xs' />
      <Tooltip title={name} enterDelay={600} enterNextDelay={600}>
        <ChatContextItemNameStyled color='textText' variant='caption'>
          {name}
        </ChatContextItemNameStyled>
      </Tooltip>
      <ChatContextItemRemoveStyled
        aria-label={locales.ai_context_remove}
        data-testid='ai-context-chip-remove'
        onClick={onClick}
      >
        <CustomIcon type='close' size='xs' />
      </ChatContextItemRemoveStyled>
    </ChatContextItemStyled>
  );
}
