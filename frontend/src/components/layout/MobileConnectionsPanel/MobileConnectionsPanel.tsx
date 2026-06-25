import Connections from '@/components/common/Connections/Connections/Connections';
import type { JSX } from 'react';
import { MobileConnectionsStyled } from './MobileConnections.styled';

export default function MobileConnectionsPanel(): JSX.Element {
  return (
    <MobileConnectionsStyled>
      <Connections expanded />
    </MobileConnectionsStyled>
  );
}
