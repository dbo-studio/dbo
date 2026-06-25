import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Stack, Tooltip } from '@mui/material';
import { type JSX, RefObject, useRef } from 'react';
import { useHover } from 'usehooks-ts';
import type { ChatContextItemProps } from '../../../types';
import { ChatContextItemNameStyled } from '../ChatContext.styled';
import { ChatContextItemStyled } from './ChatContextModalItem.styled';

export default function ChatContextItem({ name, type, onClick }: ChatContextItemProps): JSX.Element {
  const hoverRef = useRef<HTMLElement | null>(null);
  const isHover = useHover(hoverRef as RefObject<HTMLElement>);

  return (
    <ChatContextItemStyled ref={hoverRef}>
      <Stack
        direction={'row'}
        spacing={1}
        sx={{
          alignItems: 'center',
          minWidth: 0,
          overflow: 'hidden'
        }}
      >
        {isHover ? (
          <CustomIcon type='close' size='xs' onClick={onClick} />
        ) : (
          <CustomIcon type={type === 'database' ? 'database' : 'sheet'} size='xs' />
        )}

        <Tooltip title={name} enterDelay={500}>
          <ChatContextItemNameStyled color={'textText'} variant='caption'>
            {name}
          </ChatContextItemNameStyled>
        </Tooltip>
      </Stack>
    </ChatContextItemStyled>
  );
}
