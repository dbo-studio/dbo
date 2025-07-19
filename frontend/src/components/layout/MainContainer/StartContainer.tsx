import Connections from '@/components/common/Connections/Connections/Connections';
import { useWindowSize } from '@/hooks/useWindowSize.hook';
import type { JSX } from 'react';
import { StartContainerStyled } from './Container.styled';

export default function StartContainer(): JSX.Element {
  const windowSize = useWindowSize();

  return (
    <StartContainerStyled maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
      <Connections />
    </StartContainerStyled>
  );
}
