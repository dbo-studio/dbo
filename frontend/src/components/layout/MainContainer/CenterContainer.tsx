import { useWindowSize } from '@/hooks/useWindowSize.hook';

import Panels from '@/components/common/Panels/Panels';
import type { TabType } from '@/types';
import { CenterContainerStyled } from './Container.styled';

export default function CenterContainer({
  selectedTab,
  tabs
}: {
  selectedTab: TabType | undefined;
  tabs: TabType[];
}) {
  const windowSize = useWindowSize();

  return (
    <CenterContainerStyled maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
      {selectedTab && <Panels tabs={tabs} tab={selectedTab} />}
    </CenterContainerStyled>
  );
}
