import locales from '@/locales';
import { InputBase, Tooltip, Typography } from '@mui/material';
import { type KeyboardEvent, type MouseEvent, useState } from 'react';
import type { ChatItemProps } from '../../types';
import { ChatItemIconStyled, ChatItemStyled } from './ChatItem.styled';

export default function ChatItem({ chat, selected, onClick, onDelete, onRename }: ChatItemProps) {
  const [draft, setDraft] = useState<string>();

  const handleDeleteClick = (e: MouseEvent): void => {
    e.stopPropagation();
    onDelete();
  };

  const commit = (): void => {
    const title = draft?.trim();
    setDraft(undefined);
    if (title && title !== chat.title) {
      onRename(title);
    }
  };

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      setDraft(undefined);
    }
  };

  return (
    <ChatItemStyled selected={selected} onClick={onClick} data-testid='ai-chat-item'>
      {draft !== undefined ? (
        <InputBase
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          inputProps={{ maxLength: 255, 'aria-label': locales.ai_rename_chat, 'data-testid': 'ai-chat-rename-input' }}
          sx={{ fontSize: '0.75rem', p: 0 }}
        />
      ) : (
        <Tooltip title={`${chat.title} · ${locales.ai_rename_chat}: double-click`} enterDelay={500}>
          <Typography
            variant='caption'
            noWrap
            sx={{ fontWeight: selected ? 600 : 400 }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setDraft(chat.title);
            }}
          >
            {chat.title}
          </Typography>
        </Tooltip>
      )}

      <ChatItemIconStyled type='close' onClick={handleDeleteClick} selected={selected} />
    </ChatItemStyled>
  );
}
