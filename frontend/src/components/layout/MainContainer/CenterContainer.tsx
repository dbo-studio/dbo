import { useWindowSize } from '@/hooks/useWindowSize.hook';
import DBTab from '../../common/DBTab/DBTab';
import { CenterContainerStyled } from './Container.styled';

export default function CenterContainer() {
  const windowSize = useWindowSize();

  return (
    <CenterContainerStyled maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
      <DBTab />
    </CenterContainerStyled>
  );
}
