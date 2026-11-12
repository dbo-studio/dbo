import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Typography } from '@mui/material';
import type { JSX } from 'react';
import type { ConnectionItemProps } from '../../types';
import { ConnectionItemLogoStyled, ConnectionItemStyled } from './ConnectionItem.styled';

export default function ConnectionItem({ connection, selected, onClick, onOpen }: ConnectionItemProps): JSX.Element {
  return (
    <ConnectionItemStyled
      data-testid={`selected-connection-${connection.name}`}
      role='option'
      tabIndex={0}
      aria-selected={selected}
      selected={selected}
      onClick={(): void => onClick(connection)}
      onDoubleClick={(): void => onOpen(connection)}
      onKeyDown={(e): void => {
        if (e.key === 'Enter') onOpen(connection);
        else if (e.key === ' ') {
          e.preventDefault();
          onClick(connection);
        }
      }}
    >
      <ConnectionItemLogoStyled>
        <CustomIcon type={connection.logo} size='l' />
      </ConnectionItemLogoStyled>
      <Typography color={'textText'} variant='caption'>
        {connection.name}
      </Typography>
    </ConnectionItemStyled>
  );
}
