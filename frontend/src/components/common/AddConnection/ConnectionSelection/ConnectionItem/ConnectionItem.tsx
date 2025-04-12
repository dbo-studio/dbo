import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Typography } from '@mui/material';
import type { JSX } from 'react';
import type { ConnectionItemProps } from '../../types';
import { ConnectionItemLogoStyled, ConnectionItemStyled } from './ConnectionItem.styled';

export default function ConnectionItem({ connection, selected, onClick }: ConnectionItemProps): JSX.Element {
  return (
    <ConnectionItemStyled selected={selected} onClick={(): void => onClick(connection)}>
      <ConnectionItemLogoStyled>
        <CustomIcon type={'postgresql'} size='l' />
      </ConnectionItemLogoStyled>
      <Typography color={'textText'} variant='subtitle2'>
        {connection.name}
      </Typography>
    </ConnectionItemStyled>
  );
}
