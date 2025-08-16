import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Stack, Typography } from '@mui/material';
import type { JSX } from 'react';
import type { ChatContextModalItemProps } from '../../../../types';
import { ChatContextModalItemStyled } from './ChatContextModalItem.styled';

export default function ChatContextModalItem({
  name,
  type,
  isActive,
  onClick
}: ChatContextModalItemProps): JSX.Element {
  return (
    <ChatContextModalItemStyled onClick={(): void => onClick(name, type)}>
      <Stack direction={'row'} spacing={1} alignItems={'center'}>
        <CustomIcon type={type === 'databases' ? 'database' : type === 'schemas' ? 'network' : 'sheet'} size='xs' />

        <Typography color={'textText'} variant='caption'>
          {name}
        </Typography>
      </Stack>

      {isActive && <CustomIcon type='check' size='xs' />}
    </ChatContextModalItemStyled>
  );
}
