import Connections from '@/components/common/Connections/Connections';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { JSX } from 'react';
import { StartContainerStyled } from './Container.styled';

export default function StartContainer(): JSX.Element {
  const connections = useConnectionStore((state) => state.connections);
  // Without connections the rail would be an empty strip. It stays mounted, because the
  // Add connection dialog it opens for a first connection lives inside it.
  const empty = !connections || connections.length === 0;

  return (
    <StartContainerStyled sx={{ display: empty ? 'none' : undefined }}>
      <Connections />
    </StartContainerStyled>
  );
}
