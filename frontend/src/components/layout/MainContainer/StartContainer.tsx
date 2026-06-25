import Connections from '@/components/common/Connections/Connections/Connections';
import type { JSX } from 'react';
import { StartContainerStyled } from './Container.styled';

export default function StartContainer(): JSX.Element {
  return (
    <StartContainerStyled>
      <Connections />
    </StartContainerStyled>
  );
}
