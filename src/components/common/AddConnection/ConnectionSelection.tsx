import { useUUID } from '@/src/hooks';
import { Box } from '@mui/material';
import { useState } from 'react';
import Search from '../../base/Search/Search';
import { ConnectionWrapperStyled } from './AddConnection.styled';
import ConnectionItem from './ConnectionItem';
import { ConnectionSelectionProps, ConnectionType } from './types';

export default function ConnectionSelection({ connections, onChange }: ConnectionSelectionProps) {
  const uuids = useUUID(connections.length);
  const [connectionType, setConnectionType] = useState<ConnectionType | undefined>(undefined);

  const handleSearch = (value: string) => {
    console.log(value);
  };

  const handleConnectionType = (c: ConnectionType) => {
    const newConnection = connectionType?.name == c.name ? undefined : c;
    setConnectionType(newConnection);
    onChange(newConnection);
  };

  return (
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
  );
}
