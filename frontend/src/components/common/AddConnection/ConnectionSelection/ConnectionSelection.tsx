import { useUUID } from '@/hooks';
import locales from '@/locales';
import { Button } from '@mui/material';
import { type JSX, useState } from 'react';
import Search from '../../../base/Search/Search';
import type { ConnectionSelectionProps, SelectionConnectionType } from '../types';
import ConnectionItem from './ConnectionItem/ConnectionItem';
import {
  ConnectionSelectionBodyStyled,
  ConnectionSelectionContainerStyled,
  ConnectionSelectionFooterStyled,
  ConnectionWrapperStyled
} from './ConnectionSelection.styled';

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
    const newConnection = connectionType?.type === c.type ? undefined : c;
    setConnectionType(newConnection);
  };

  const handleOnSubmit = (): void => {
    onSubmit(connectionType);
  };

  return (
    <ConnectionSelectionContainerStyled>
      <ConnectionSelectionBodyStyled>
        <Search onChange={handleSearch} />
        <ConnectionWrapperStyled>
          {visibleConnections.map((c, index: number) => (
            <ConnectionItem
              selected={connectionType?.type === c.type}
              onClick={handleConnectionType}
              key={uuids[index]}
              connection={c}
            />
          ))}
        </ConnectionWrapperStyled>
      </ConnectionSelectionBodyStyled>
      <ConnectionSelectionFooterStyled>
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
      </ConnectionSelectionFooterStyled>
    </ConnectionSelectionContainerStyled>
  );
}
