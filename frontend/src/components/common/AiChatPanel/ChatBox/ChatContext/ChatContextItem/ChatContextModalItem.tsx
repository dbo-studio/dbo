import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Stack, Typography } from '@mui/material';
import { type JSX, useRef } from 'react';
import { useHover } from 'usehooks-ts';
import type { ChatContextItemProps } from '../../../types';
import { ChatContextItemStyled } from './ChatContextModalItem.styled';

export default function ChatContextItem({ name, type, onClick }: ChatContextItemProps): JSX.Element {
  const hoverRef = useRef<HTMLElement | null>(null);
  // @ts-expect-error
  const isHover = useHover(hoverRef);

  return (
    <ChatContextItemStyled ref={hoverRef}>
      <Stack direction={'row'} spacing={1} alignItems={'center'}>
        {isHover ? (
          <CustomIcon type='close' size='xs' onClick={onClick} />
        ) : (
          <CustomIcon type={type === 'database' ? 'database' : 'sheet'} size='xs' />
        )}

        <Typography color={'textText'} variant='caption'>
          {name}
        </Typography>
      </Stack>
    </ChatContextItemStyled>
  );
}
