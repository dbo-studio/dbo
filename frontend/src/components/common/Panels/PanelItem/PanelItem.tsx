'use no memo';

import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks';
import Data from '@/routes/Data/Data';
import ObjectForm from '@/routes/ObjectForm/ObjectForm';
import Query from '@/routes/Query/Query';
import type { JSX } from 'react';
import { PanelItemStyled } from './PanelItem.styled';

export default function PanelItem(): JSX.Element {
  const selectedTab = useSelectedTab();
  if (!selectedTab) return <></>;

  return (
    <PanelItemStyled>
      {selectedTab
        ? (selectedTab.mode === TabMode.Data && <Data />) ||
          (selectedTab.mode === TabMode.Query && <Query />) ||
          (selectedTab.mode === TabMode.Object && <ObjectForm />) ||
          (selectedTab.mode === TabMode.ObjectDetail && <ObjectForm />)
        : null}
    </PanelItemStyled>
  );
}
