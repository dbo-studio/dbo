import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { Box, Tooltip, Typography } from '@mui/material';
import type { MouseEvent } from 'react';
import { relativeTime } from '../../utils/relativeTime';
import { ChatHistoryItemStyled } from '../ChatHistory.styled';
import { ChatHistoryItemProps } from '../types';

const stop =
  (handler: () => void) =>
  (event: MouseEvent): void => {
    event.stopPropagation();
    handler();
  };

export default function ChatHistoryItem({
  item,
  onClick,
  onDelete,
  onTogglePin,
  onExport,
  selected = false
}: ChatHistoryItemProps) {
  return (
    <ChatHistoryItemStyled
      direction='row'
      onClick={onClick}
      className={selected ? 'is-selected' : undefined}
      data-testid='ai-history-item'
      data-selected={selected}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <CustomIcon type={item.pinned ? 'pin' : 'message'} size='xs' />
        <Box sx={{ ml: 1, minWidth: 0 }}>
          <Typography color={'textText'} variant='caption' noWrap sx={{ display: 'block' }}>
            {item.title}
          </Typography>
          <Typography color={'textSubdued'} variant='caption' sx={{ display: 'block', fontSize: '0.625rem' }}>
            {relativeTime(item.updatedAt ?? item.createdAt)}
          </Typography>
        </Box>
      </Box>
      <Box className='history-actions'>
        <Tooltip title={item.pinned ? locales.ai_history_unpin : locales.ai_history_pin}>
          <span data-testid='ai-history-pin'>
            <CustomIcon type={item.pinned ? 'pinOff' : 'pin'} size='xs' onClick={stop(onTogglePin)} />
          </span>
        </Tooltip>
        <Tooltip title={locales.ai_history_export}>
          <span data-testid='ai-history-export'>
            <CustomIcon type='download' size='xs' onClick={stop(onExport)} />
          </span>
        </Tooltip>
        <Tooltip title={locales.ai_history_delete}>
          <span data-testid='ai-history-delete'>
            <CustomIcon type='close' size='xs' onClick={stop(onDelete)} />
          </span>
        </Tooltip>
      </Box>
    </ChatHistoryItemStyled>
  );
}
