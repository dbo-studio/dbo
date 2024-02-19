import { useUUID } from '@/src/hooks';
import locales from '@/src/locales';
import { Box, Button } from '@mui/material';
import { useState } from 'react';
import Search from '../../../../base/Search/Search';
import ConnectionItem from '../ConnectionItem/ConnectionItem';
import { ConnectionSelectionProps, ConnectionType } from '../types';
import { ConnectionWrapperStyled } from './ConnectionSelection.styled';

export default function ConnectionSelection({ connections, onSubmit, onClose }: ConnectionSelectionProps) {
  const uuids = useUUID(connections.length);
  const [connectionType, setConnectionType] = useState<ConnectionType | undefined>(undefined);

  const handleSearch = (value: string) => {
    console.log(value);
  };

  const handleConnectionType = (c: ConnectionType) => {
    const newConnection = connectionType?.name == c.name ? undefined : c;
    setConnectionType(newConnection);
  };

  const handleOnSubmit = () => {
    onSubmit(connectionType);
  };

  return (
    <Box flex={1} display={'flex'} flexDirection={'column'}>
      <Box flex={1}>
        <Search onChange={handleSearch} />
        <ConnectionWrapperStyled>
          {connections.map((c, index: number) => (
            <ConnectionItem
              selected={connectionType?.name === c.name}
              onClick={handleConnectionType}
              key={uuids[index]}
              connection={c}
            />
          ))}
        </ConnectionWrapperStyled>
      </Box>
      <Box display={'flex'} justifyContent={'space-between'}>
        <Button size='small' onClick={onClose}>
          {locales.cancel}
        </Button>
        <Button onClick={handleOnSubmit} disabled={!connectionType} size='small' variant='contained'>
          {locales.create}
        </Button>
      </Box>
    </Box>
  );
}
