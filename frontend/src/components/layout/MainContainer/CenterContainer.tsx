import { useWindowSize } from '@/hooks/useWindowSize.hook';

import Panels from '@/components/common/Panels/Panels';
import { CenterContainerStyled } from './Container.styled';

export default function CenterContainer() {
  const windowSize = useWindowSize();

  return (
    <CenterContainerStyled maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
      <Panels />
    </CenterContainerStyled>
  );
}
