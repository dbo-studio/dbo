import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Stack, Tooltip } from '@mui/material';
import type { JSX } from 'react';
import type { ChatContextModalItemProps } from '../../../types';
import { ChatContextItemNameStyled } from '../ChatContext.styled';
import { ChatContextModalItemStyled } from './ChatContextModalItem.styled';

export default function ChatContextModalItem({
  name,
  type,
  isActive,
  onClick
}: ChatContextModalItemProps): JSX.Element {
  return (
    <ChatContextModalItemStyled onClick={(): void => onClick(name, type)}>
      <Stack
        direction={'row'}
        spacing={1}
        sx={{
          alignItems: 'center',
          minWidth: 0,
          flex: 1,
          overflow: 'hidden'
        }}
      >
        <CustomIcon type={type === 'database' ? 'database' : 'sheet'} size='xs' />

        <Tooltip title={name} enterDelay={500}>
          <ChatContextItemNameStyled color={'textText'} variant='caption'>
            {name}
          </ChatContextItemNameStyled>
        </Tooltip>
      </Stack>
      {isActive && <CustomIcon type='check' size='xs' />}
    </ChatContextModalItemStyled>
  );
}
