import { useUUID } from '@/hooks';
import locales from '@/locales';
import { Box, Button } from '@mui/material';
import { type JSX, useState } from 'react';
import Search from '../../../base/Search/Search';
import type { ConnectionSelectionProps, SelectionConnectionType } from '../types';
import ConnectionItem from './ConnectionItem/ConnectionItem';
import { ConnectionWrapperStyled } from './ConnectionSelection.styled';

export default function ConnectionSelection({ connections, onSubmit, onClose }: ConnectionSelectionProps): JSX.Element {
  const uuids = useUUID(connections.length);
  const [visibleConnections, setVisibleConnections] = useState(connections);

  const [connectionType, setConnectionType] = useState<SelectionConnectionType | undefined>(undefined);

  const handleSearch = (value: string): void => {
    setVisibleConnections(
      connections.filter((c: SelectionConnectionType) => {
        return c.name.toLocaleLowerCase().includes(value.toLocaleLowerCase());
      })
    );
  };

  const handleConnectionType = (c: SelectionConnectionType): void => {
    const newConnection = connectionType?.name === c.name ? undefined : c;
    setConnectionType(newConnection);
  };

  const handleOnSubmit = (): void => {
    onSubmit(connectionType);
  };

  return (
    <Box flex={1} display={'flex'} flexDirection={'column'}>
      <Box flex={1} mt={1}>
        <Search onChange={handleSearch} />
        <ConnectionWrapperStyled>
          {visibleConnections.map((c, index: number) => (
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
        <Button
          data-testid='select-connection'
          onClick={handleOnSubmit}
          disabled={!connectionType}
          size='small'
          variant='contained'
        >
          {locales.create}
        </Button>
      </Box>
    </Box>
  );
}
