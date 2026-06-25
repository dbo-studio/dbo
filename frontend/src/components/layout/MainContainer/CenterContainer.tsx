import Panels from '@/components/common/Panels/Panels';
import type { JSX } from 'react';
import { CenterContainerStyled } from './Container.styled';

export default function CenterContainer(): JSX.Element {
  return (
    <CenterContainerStyled>
      <Panels />
    </CenterContainerStyled>
  );
}
