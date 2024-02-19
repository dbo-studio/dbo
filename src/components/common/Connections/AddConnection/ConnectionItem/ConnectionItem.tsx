import { Typography } from '@mui/material';
import Image from 'next/image';
import { ConnectionItemProps } from '../types';
import { ConnectionItemLogoStyled, ConnectionItemStyled } from './ConnectionItem.styled';

export default function ConnectionItem({ connection, selected, onClick }: ConnectionItemProps) {
  return (
    <ConnectionItemStyled selected={selected} onClick={() => onClick(connection)}>
      <ConnectionItemLogoStyled>
        <Image width={25} height={25} alt={connection.name} src={connection.logo} />
      </ConnectionItemLogoStyled>
      <Typography variant='subtitle2'>{connection.name}</Typography>
    </ConnectionItemStyled>
  );
}
